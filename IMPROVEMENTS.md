# Proposed Improvements for Weight-Based Warehouse Management System

This document outlines suggested improvements to enhance the system's functionality, usability, and scalability.

## 1. Scale Manager Improvements

### 1.1 One-Click Tare/Calibration

- **Current State**: Tare is a static field in the scale settings.
- **Improvement**: Add a "Tare Now" button in the `ScaleManager` card for each scale.
- **Logic**: When clicked, it should read the current live weight from the scale and update the `tare` field in the database for that scale.
- **Benefit**: Simplifies calibration when a container is placed on the scale.

### 1.2 Heartbeat Visual Feedback

- **Current State**: Health status is shown as a text badge (Online/Offline).
- **Improvement**: Add a pulsing animation (e.g., a small green dot) for "ONLINE" scales.
- **Benefit**: Provides immediate visual assurance that the system is receiving live data.

### 1.3 Detailed Scale Diagnostics

- **Current State**: Displays last weight and last received time.
- **Improvement**: Add a "Diagnostics" dialog showing:
  - Raw weight (before tare)
  - Tared weight
  - Connection stability (reconnect attempts history)
  - Heartbeat interval consistency
- **Benefit**: Helps in troubleshooting hardware or network issues.

### 1.4 Scale Alerting System

- **Improvement**: Implement an alerting system that notifies admins (via Toast or Email/SMS) if a critical scale goes offline during operating hours.

---

## 2. Logical & Business Improvements

### 2.1 Inventory Reconciliation

- **Feature**: Add a "Reconciliation" module.
- **Logic**: Compare theoretical stock (calculated from Stock In/Out records) with actual weight currently on the scales (for scales assigned to specific products).
- **Benefit**: Detects shrinkage, theft, or data entry errors automatically.

### 2.2 Advanced Stock Thresholds

- **Current State**: Basic `minStock` check.
- **Improvement**:
  - Add `reorderPoint` and `safetyStock` levels.
  - Implement a "Suggested Orders" report based on current consumption rates.
- **Benefit**: Optimizes inventory levels and prevents stockouts.

### 2.3 Automated Stock Adjustments

- **Feature**: For bins with integrated scales, allow the system to auto-record "Stock Out" events when a significant weight drop is detected (and not manually recorded).
- **Benefit**: Reduces manual data entry and improves real-time accuracy.

### 2.4 Activity Log Enrichment

- **Improvement**: Log more specific metadata in the `Activity` model:
  - Scale calibration changes (Old Tare -> New Tare)
  - Scale status changes (Online -> Offline)
  - Bulk operation details (which scales were moved to which warehouse)
- **Benefit**: Better audit trail for compliance and troubleshooting.

---

## 3. UI/UX Improvements

### 3.1 Enhanced Localization (Persian/Jalali)

- **Improvement**: Ensure all date displays use Jalali format consistently.
- **Tooling**: leverage `date-fns-jalali` across all components (some parts might still use standard Gregorian formatting).
- **Benefit**: Native experience for Persian-speaking users.

### 3.2 Advanced Reporting Visualizations

- **Current State**: Simple Bar Charts for In/Out.
- **Improvement**:
  - Pie charts for inventory distribution by category.
  - Line charts for stock level trends over time.
  - Heatmap of warehouse activity.
- **Benefit**: Better data-driven decision making.

### 3.3 Product QR Code / Barcode Label Printing

- **Feature**: Add a "Print Label" button for products.
- **Logic**: Generate a PDF or image with the Product Name, SKU, and a scannable QR/Barcode.
- **Benefit**: Facilitates physical organization of the warehouse.

### 3.4 Improved Mobile Experience

- **Current State**: Responsive layout exists.
- **Improvement**:
  - Optimize the `StockIn` and `StockOut` forms for one-handed operation on mobile devices.
  - Integrate a native camera scanner more deeply (currently uses `html5-qrcode`).
- **Benefit**: Faster warehouse operations for staff on the move.

### 3.5 Consistent Client-Side Validation

- **Improvement**: Ensure all forms use Zod schemas with the `zodResolver` in `react-hook-form` and provide clear, Persian error messages immediately.
- **Benefit**: Reduces server roundtrips and improves user confidence.
