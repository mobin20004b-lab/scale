# WMS System Improvements & Roadmap

This document outlines suggested improvements for the Weight-Based Warehouse Management System, categorized by Scale Management, Logical/Business logic, and UI/UX enhancements.

## 1. Scale Manager Improvements
- [ ] **One-Click Tare/Calibration**: Add a "Tare Now" button in the Scale Manager UI. Clicking this should capture the current live weight from the scale and automatically update the `tare` value in the database for that scale.
- [ ] **Visual Connection Status**: Implement a pulsing green dot indicator for "ONLINE" scales to provide immediate visual confirmation of active communication.
- [ ] **Detailed Weight View**: Display both "Raw Weight" (from the scale) and "Display Weight" (Raw - Tare) in the scale management card for easier troubleshooting and transparency.
- [ ] **Scale Activity Logs**: Add a dedicated log view for each scale showing connection/disconnection events and tare changes.

## 2. Logical & Business Improvements
- [ ] **Inventory Reconciliation Report**: Create a report that compares the theoretical stock levels (calculated from Stock In/Out transactions) with actual physical weight readings from scales (for products assigned to specific bins/scales).
- [ ] **Automated Stock Alerts**: Implement a background job or event-driven system to send notifications (in-app or email) when a product's current stock falls below its `minStock` threshold.
- [ ] **Rich Activity Logs**: Enhance the `Activity` model to store "Before" and "After" JSON snapshots of entities, allowing users to see exactly what changed during a product or scale update.
- [ ] **Batch Stock In/Out**: Support multi-item transactions in a single invoice/session to speed up high-volume warehouse operations.

## 3. UI/UX Improvements
- [ ] **Consistent Jalali Date Display**: Audit all tables and views to ensure Persian (Jalali) dates are consistently formatted using the `DateTimeText` component and `date-fns-jalali`.
- [ ] **Quick Action Buttons**: Add "Stock In" and "Stock Out" buttons directly on each row of the Product List table to reduce navigation steps.
- [ ] **Enhanced Mobile Experience**:
    - Convert product and scale forms into full-screen drawers (`vaul`) on small screens for better ergonomics.
    - Optimize the sidebar for touch devices, ensuring the hamburger menu is easily accessible.
- [ ] **Data Visualization**:
    - Add a "Stock Over Time" line chart to product details pages.
    - Implement a "Warehouse Occupancy" gauge on the main dashboard.
- [ ] **Improved Form Validation**: Ensure all forms have immediate inline validation feedback using Zod schemas on the client-side.
