import { prisma } from "@/lib/prisma";

const PENDING_DELETE_WINDOW_MS = 5000;

type EntityType = "product" | "warehouse" | "scale";

type DeleteRow = {
  id: string;
  updatedAt: Date;
  deleteRequestedAt: Date | null;
  deleteCommitAfter: Date | null;
  deleteConflictAt: Date | null;
  deleteRequestedFromUpdatedAt: Date | null;
};

const modelMap = {
  product: prisma.product,
  warehouse: prisma.warehouse,
  scale: prisma.scale,
} as const;

export async function finalizeDueDeletes(entity: EntityType) {
  const now = new Date();
  const due = (await modelMap[entity].findMany({
    where: {
      deleteRequestedAt: { not: null },
      deleteCommitAfter: { lte: now },
    },
    select: {
      id: true,
      updatedAt: true,
      deleteRequestedAt: true,
      deleteCommitAfter: true,
      deleteConflictAt: true,
      deleteRequestedFromUpdatedAt: true,
    },
  })) as DeleteRow[];

  for (const row of due) {
    if (
      !row.deleteRequestedFromUpdatedAt ||
      row.updatedAt.getTime() !== row.deleteRequestedFromUpdatedAt.getTime()
    ) {
      await modelMap[entity].update({
        where: { id: row.id },
        data: {
          deleteRequestedAt: null,
          deleteCommitAfter: null,
          deleteRequestedFromUpdatedAt: null,
          deleteConflictAt: now,
        },
      });
      continue;
    }

    await modelMap[entity].delete({ where: { id: row.id } });
  }
}

export async function requestDelete(
  entity: EntityType,
  id: string,
  options?: { mode?: "delete" | "archive" }
) {
  await finalizeDueDeletes(entity);

  const row = (await modelMap[entity].findUnique({
    where: { id },
    select: {
      id: true,
      updatedAt: true,
      deleteRequestedAt: true,
      deleteCommitAfter: true,
      deleteConflictAt: true,
      deleteRequestedFromUpdatedAt: true,
      ...(entity === "scale" || entity === "warehouse"
        ? {
            _count: {
              select:
                entity === "warehouse"
                  ? { scales: true, stockIns: true, stockOuts: true }
                  : { stockIns: true },
            },
          }
        : {}),
    },
  })) as
    | (DeleteRow & {
        _count?: { stockIns?: number; scales?: number; stockOuts?: number };
      })
    | null;

  if (!row) {
    return { status: 404 as const, body: { error: "Not found" } };
  }

  if (entity === "warehouse") {
    const scales = row._count?.scales ?? 0;
    const transactions =
      (row._count?.stockIns ?? 0) + (row._count?.stockOuts ?? 0);
    const hasDependencies = scales > 0 || transactions > 0;

    if (hasDependencies && options?.mode === "delete") {
      return {
        status: 409 as const,
        body: {
          error:
            "این انبار وابستگی فعال دارد. برای جلوگیری از حذف ناخواسته، فقط آرشیو مجاز است.",
          requiresArchive: true,
        },
      };
    }
  }

  if (entity === "scale" && (row._count?.stockIns ?? 0) > 0) {
    return {
      status: 409 as const,
      body: {
        error:
          "این ترازو سابقه تراکنش دارد و فقط می‌تواند آرشیو شود، نه حذف کامل.",
      },
    };
  }

  const now = new Date();
  const commitAfter = new Date(now.getTime() + PENDING_DELETE_WINDOW_MS);
  const updated = await modelMap[entity].update({
    where: { id },
    data: {
      deleteRequestedAt: now,
      deleteCommitAfter: commitAfter,
      deleteConflictAt: null,
      deleteRequestedFromUpdatedAt: row.updatedAt,
    },
    select: {
      id: true,
      deleteRequestedAt: true,
      deleteCommitAfter: true,
      deleteConflictAt: true,
    },
  });

  return {
    status: 202 as const,
    body: {
      success: true,
      pendingDelete: true,
      id: updated.id,
      deleteRequestedAt: updated.deleteRequestedAt,
      deleteCommitAfter: updated.deleteCommitAfter,
      deleteConflictAt: updated.deleteConflictAt,
    },
  };
}

export async function recoverDelete(entity: EntityType, id: string) {
  await finalizeDueDeletes(entity);

  const row = (await modelMap[entity].findUnique({
    where: { id },
    select: {
      id: true,
      updatedAt: true,
      deleteRequestedAt: true,
      deleteCommitAfter: true,
      deleteConflictAt: true,
      deleteRequestedFromUpdatedAt: true,
    },
  })) as DeleteRow | null;

  if (!row) {
    return { status: 404 as const, body: { error: "Not found" } };
  }

  if (!row.deleteRequestedAt || !row.deleteCommitAfter) {
    return {
      status: 409 as const,
      body: { error: "Delete request is not pending for this entity." },
    };
  }

  if (
    !row.deleteRequestedFromUpdatedAt ||
    row.updatedAt.getTime() !== row.deleteRequestedFromUpdatedAt.getTime()
  ) {
    await modelMap[entity].update({
      where: { id },
      data: {
        deleteRequestedAt: null,
        deleteCommitAfter: null,
        deleteRequestedFromUpdatedAt: null,
        deleteConflictAt: new Date(),
      },
    });

    return {
      status: 409 as const,
      body: {
        error:
          "Entity changed while delete was pending. Delete request was cancelled safely.",
        conflict: true,
      },
    };
  }

  const recovered = await modelMap[entity].update({
    where: { id },
    data: {
      deleteRequestedAt: null,
      deleteCommitAfter: null,
      deleteRequestedFromUpdatedAt: null,
      deleteConflictAt: null,
    },
    select: {
      id: true,
      deleteRequestedAt: true,
      deleteCommitAfter: true,
      deleteConflictAt: true,
    },
  });

  return {
    status: 200 as const,
    body: {
      success: true,
      recovered: true,
      id: recovered.id,
      deleteRequestedAt: recovered.deleteRequestedAt,
      deleteCommitAfter: recovered.deleteCommitAfter,
      deleteConflictAt: recovered.deleteConflictAt,
    },
  };
}
