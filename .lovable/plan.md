

## Problem Analysis

The driver opens the "Detalhes da Etapa" secondary dialog (line 872), which contains the `FileUploadArea` component. On mobile, when the camera/gallery opens, the app goes to background. When the user returns, the photo doesn't appear in the attachment list.

**Root causes identified:**

1. **Nested Dialog issue**: The `FileUploadArea` sits inside a nested `Dialog` (driver step dialog inside the main request dialog). On mobile, when the camera/gallery picker opens and the page goes to background, Radix Dialog may trigger internal focus/pointer events that interfere with the file input's `onChange` event.

2. **Input `accept` attribute**: The input uses `accept={isMobile ? "image/*" : "*/*"}` (line 129). On some Android devices, `image/*` can cause issues with the file picker not returning data properly. The memory note confirms: "para contornar seletores de mídia no Android, utiliza `accept='*/*'`".

3. **Input z-index and positioning**: The hidden input has `zIndex: -1` (line 130) which, inside a nested dialog with portal rendering, may cause the input to be clipped or removed from the accessible DOM on some mobile browsers, preventing the `onChange` from firing.

## Plan

### 1. Fix FileUploadArea for mobile camera/gallery reliability

In `src/components/shared/FileUploadArea.tsx`:

- Change `accept` to always use `"image/*,application/pdf,*/*"` or a more permissive value on mobile instead of strictly `"image/*"`, which fails on some Android devices
- Add `capture` support: provide separate buttons/inputs for "Camera" (with `capture="environment"`) and "Gallery" (without `capture`) on mobile, both triggering correctly from user gesture
- Move the input's positioning to use `position: fixed` with `opacity: 0` to avoid z-index stacking context issues inside nested dialogs
- Ensure `onChange` handler uses a more robust approach: read the file immediately and store it, rather than relying on the File reference surviving background/foreground transitions

### 2. Prevent dialog interference during file selection

In `src/components/shared/UnifiedRequestDetailsDialog.tsx`:

- The driver step dialog (line 872) already blocks `onOpenChange`, `onInteractOutside`, `onPointerDownOutside`, and `onFocusOutside` — these are correct
- Add an `onEscapeKeyDown` handler with `e.preventDefault()` to also prevent escape key from closing during file selection
- Ensure the parent dialog's `onEscapeKeyDown` doesn't cascade and close the inner dialog

### Summary of changes

| File | Change |
|------|--------|
| `src/components/shared/FileUploadArea.tsx` | Fix `accept` attribute for Android, use `position: fixed` for hidden input, add separate camera/gallery triggers on mobile |
| `src/components/shared/UnifiedRequestDetailsDialog.tsx` | Add `onEscapeKeyDown` prevention on driver step dialog |

