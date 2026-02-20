# Weight-based Warehouse Management System - Full Plan

## 🎯 Project Objective
Build a production-ready, secure, and beautiful Persian (Farsi) warehouse management system for tracking weight-based inventory with barcode/QR code support, advanced reporting, and external API integration.

## 📊 Key Results (KR)
1. **KR1**: Secure authentication system with NextAuth.js protecting all dashboard routes
2. **KR2**: Complete product management system with CRUD operations
3. **KR3**: Stock entry/exit system with barcode/QR code scanning and generation
4. **KR4**: Advanced reporting with date range, product, and operation type filtering
5. **KR5**: Excel export functionality for products and reports
6. **KR6**: REST API endpoints for external sensor/bot integration
7. **KR7**: Fully RTL Persian UI with Vazirmatn font and clean corporate design

## 🏗️ Technical Architecture

### Tech Stack
- **Framework**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js (Credentials Provider)
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table + xlsx
- **Barcode/QR**: react-qr-code, html5-qrcode
- **Icons**: Lucide React
- **Font**: Vazirmatn (Persian)

### Database Schema
```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String   // hashed with bcrypt
  name      String
  role      String   @default("admin")
  createdAt DateTime @default(now())
}

model Product {
  id          String      @id @default(cuid())
  name        String
  sku         String      @unique
  barcode     String?     @unique
  description String?
  unitWeight  Float       // kg
  currentStock Float      @default(0)
  minStock    Float       @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  operations  Operation[]
}

model Operation {
  id          String   @id @default(cuid())
  type        String   // "IN" or "OUT"
  weight      Float    // kg
  source      String   // "MANUAL", "API", "BARCODE"
  notes       String?
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  userId      String?
  createdAt   DateTime @default(now())
}
```

## 📋 Implementation Tasks

### ✅ Task 1: Database Setup & Prisma Configuration
- [ ] Set up PostgreSQL database integration
- [ ] Create Prisma schema with User, Product, Operation models
- [ ] Create and run migrations
- [ ] Seed default admin user (admin/admin123)
- [ ] Create database client utilities

### ✅ Task 2: Authentication System
- [ ] Configure NextAuth.js with Credentials provider
- [ ] Create login page with Persian UI and RTL
- [ ] Implement middleware to protect dashboard routes
- [ ] Create session utilities and hooks
- [ ] Add logout functionality

### ✅ Task 3: Layout & Navigation
- [ ] Configure Vazirmatn Persian font
- [ ] Set up RTL layout in root layout
- [ ] Create sidebar navigation component
- [ ] Design dashboard layout with header
- [ ] Implement responsive mobile menu

### ✅ Task 4: Product Management System
- [ ] Create products page with data table
- [ ] Build add/edit product modal/form
- [ ] Implement product CRUD operations (API routes)
- [ ] Add product search and filtering
- [ ] Implement Excel export for products

### ✅ Task 5: Stock Operations (Entry/Exit)
- [ ] Create stock operations page
- [ ] Build entry form with barcode generation
- [ ] Build exit form with barcode scanning
- [ ] Implement QR code scanner component
- [ ] Create operation API routes
- [ ] Update product stock automatically

### ✅ Task 6: Barcode & QR Code Integration
- [ ] Implement barcode generation for new products
- [ ] Create QR code display component
- [ ] Integrate html5-qrcode scanner
- [ ] Add camera permission handling
- [ ] Create scanner UI component

### ✅ Task 7: Advanced Reporting System
- [ ] Create reports page with TanStack Table
- [ ] Implement date range picker (Persian calendar support)
- [ ] Add product name filter
- [ ] Add operation type filter
- [ ] Implement filter logic and API
- [ ] Add Excel export for filtered reports

### ✅ Task 8: External API Development
- [ ] Create API route for external data entry
- [ ] Implement API authentication (API keys)
- [ ] Add GET /api/external/products endpoint
- [ ] Add POST /api/external/operations endpoint
- [ ] Add GET /api/external/barcode/:sku endpoint
- [ ] Create API documentation

### ✅ Task 9: UI Polish & Persian Localization
- [ ] Apply consistent RTL styling throughout
- [ ] Translate all UI text to Persian
- [ ] Add loading states and skeletons
- [ ] Implement error handling and toasts
- [ ] Add animations and transitions
- [ ] Ensure accessibility

### ✅ Task 10: Testing & Deployment Prep
- [ ] Test all CRUD operations
- [ ] Test barcode/QR scanning
- [ ] Test Excel exports
- [ ] Test external API endpoints
- [ ] Verify authentication flows
- [ ] Optimize performance

## 🎨 Design Guidelines

### Color Palette
- **Primary**: Blue (#3B82F6) - for CTAs and important actions
- **Success**: Green (#10B981) - for entry operations
- **Danger**: Red (#EF4444) - for exit operations
- **Neutral**: Grays (#F9FAFB to #1F2937) - for backgrounds and text
- **Accent**: Amber (#F59E0B) - for warnings and highlights

### Typography
- **Headings**: Vazirmatn Bold
- **Body**: Vazirmatn Regular
- **Size Scale**: text-sm, text-base, text-lg, text-xl, text-2xl

### Spacing & Layout
- Use consistent gap-4, gap-6 for spacing
- Card-based design with rounded-lg and shadow-sm
- Sidebar width: 280px desktop, full-screen mobile
- Content max-width: max-w-7xl

## 🔒 Security Considerations
- Password hashing with bcrypt (10 rounds)
- Protected API routes with getServerSession
- CSRF protection via NextAuth
- Input validation with Zod on all forms
- SQL injection prevention via Prisma
- API key authentication for external endpoints

## 📱 Responsive Design
- Mobile-first approach
- Collapsible sidebar on mobile
- Touch-friendly buttons (min 44px)
- Responsive tables with horizontal scroll
- Bottom navigation for mobile

## 🚀 Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Default admin user seeded
- [ ] Build passes without errors
- [ ] All API routes tested
- [ ] Performance optimized

---

**Note**: This plan follows a systematic approach to build a production-ready warehouse management system with all requested features implemented professionally.
