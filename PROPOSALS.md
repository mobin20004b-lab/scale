# Scale Manager Improvements Proposal

This document outlines suggested UI/UX improvements, functional enhancements, and solutions for the requirements provided.

## 1. UI/UX Improvements for All Forms

### Consistent Design Language
*   **Visual Hierarchy:** Use distinct font sizes and weights for labels, helper texts, and error messages.
*   **Input Groups:** Group related fields together (e.g., product details vs. transaction details).
*   **Progressive Disclosure:** Hide advanced or optional fields behind an "Advanced Options" toggle to keep forms simple for everyday use.

### Enhanced Feedback
*   **Real-time Validation:** Ensure all forms use Zod-based real-time validation with clear, Persian error messages that appear as the user types.
*   **Success Animations:** Add subtle success animations or toast notifications with more context (e.g., "Product 'X' added with weight 'Y'").
*   **Loading States:** Use skeletons or overlays more consistently during API calls to prevent double-submission.

### Mobile Optimization
*   **Touch Targets:** Ensure all buttons and select triggers are at least 44x44 pixels.
*   **Input Types:** Use appropriate HTML input types (e.g., `type="number"`, `inputmode="decimal"`) to trigger the correct virtual keyboard on mobile.
*   **Sticky Actions:** Continue using the fixed bottom bar for primary actions on mobile, but ensure it doesn't overlap with important form fields.

### Accessibility & Localization
*   **Focus Management:** Automatically focus the first relevant field (or barcode input) when a form opens.
*   **RTL Consistency:** Ensure numerical inputs are always `dir="ltr"` for readability, while text remains `dir="rtl"`.
*   **Keyboard Shortcuts:** Implement shortcuts like `Ctrl+S` for saving or `Alt+N` for new entries.

---

## 2. Stock-In Form Enhancements

### Better Scale Weight View
*   **Digital Display Component:** Replace the current small text box with a large, high-contrast digital display that mimics a physical scale's LCD.
*   **Stability Indicator:** Show a "Stable" icon (e.g., a green checkmark) when the weight has not changed significantly for 2 seconds, indicating it's safe to capture.
*   **Unit Switching:** Allow users to toggle between units (if supported) directly on the weight display.

### Live Weight Data Integration
*   **Auto-Sync Quantity:** Add a toggle for "Auto-Sync Weight to Quantity" which continuously updates the quantity field as the scale weight changes.
*   **Capture Button:** A large, prominent button next to the digital display to "Freeze/Capture" the current weight into the form.
*   **Historical Weights:** Show the last 3 captured weights for quick reference or correction.

---

## 3. Barcode Usage & Tagging Ideas

### Unique Item Tagging (Serial Numbers)
*   **Beyond Product Barcodes:** Instead of just scanning the generic product barcode, the system should generate a **Unique Tag ID** for every stock-in event.
*   **QR Code Support:** Use QR codes for tags as they can store more information and are easier to scan with mobile cameras.

### Physical Scanner Support
*   **HID Mode Optimization:** Ensure the barcode input field is always ready to receive input from a hardware scanner without requiring a manual click.
*   **Continuous Scanning:** Allow scanning multiple items in a row without the form closing or resetting manually.

---

## 4. Requirements Solution & Task List

### Requirement 1: Product Tag Printing
We will implement a label printing system that generates a unique tag for each item upon stock-in.

*   **Logic:** Every `StockIn` record will now be treated as a "Batch" or "Unique Item".
*   **Tag Contents:**
    *   Product Name (Label)
    *   Unique Barcode (referencing the specific StockIn ID)
    *   Net Weight
    *   Date of Entry

### Requirement 2: Automatic Stock-Out
Scanning the unique tag will trigger an immediate stock-out for that specific item.

*   **Logic:** When the barcode is scanned in the Stock-Out screen, the system identifies the specific `StockIn` record, matches the weight, and marks it as "Sold/Out".
*   **Solving Logical Stock-Out Issues:** Currently, stock-out is "deductive" from a total. By moving to "Item-Level Tracking", we ensure that the exact weight that came in is the one that goes out, eliminating discrepancies.

---

## Detailed Task List

### Phase 1: Database & Schema
- [ ] Update `StockIn` model to include a `isOut` boolean or `remainingQuantity`.
- [ ] Add a `serialNumber` or `uniqueTagId` field to `StockIn`.
- [ ] Create a migration to initialize these fields.

### Phase 2: Tag Printing System
- [ ] Create a `/api/print/tag/[stockInId]` endpoint to generate a printable label layout (PDF or HTML).
- [ ] Add a "Print Tag" button to the success state of the Stock-In form.
- [ ] Add a "Print Tag" action to the Stock-In list table.
- [ ] Design a CSS-print optimized tag layout (50mm x 30mm or similar).

### Phase 3: Enhanced Stock-In UI
- [ ] Implement the "Digital Scale Display" component in `StockInForm`.
- [ ] Add "Auto-capture" logic with stability detection.
- [ ] Add a keyboard shortcut ('C') to capture the current live weight.

### Phase 4: Intelligent Stock-Out
- [ ] Update `BarcodeScanner` to recognize "Unique Tag IDs" vs "Product Barcodes".
- [ ] Implement an "Auto Stock-Out" mode:
    - [ ] Scan Unique Tag -> Fetch specific item details.
    - [ ] If found, automatically fill `productId`, `quantity` (weight), and `notes` with "Auto-scanned".
    - [ ] (Optional) Toggle for "Instant Submit" upon successful scan.
- [ ] Update Stock-Out API to handle specific item deduction if a Unique Tag is provided.

### Phase 5: UI/UX Refinement
- [ ] Audit all forms for RTL consistency and numerical `dir="ltr"`.
- [ ] Implement "Quick Search" in product selection dropdowns.
- [ ] Add "Last Activity" summary to the dashboard for immediate verification of stock movements.
- [ ] Enhance mobile responsiveness of the reports table.
