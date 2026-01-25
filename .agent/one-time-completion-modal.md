# One-Time Course Completion Modal

## Overview
The course completion modal now shows **only once** per course completion, ensuring a professional user experience.

## Implementation

### Logic Flow

```typescript
// Check if user already has certificate or if modal was shown this session
const hasCertificate = myCertificates.some(c => c.course?.id === courseId);
const shouldShowFinishButton = finishingCourse && !hasCertificate && !hasShownCompletionModal;
```

### Conditions for Showing "Finish Course" Button

The button will **ONLY** show when **ALL** of these are true:

1. ✅ **Course is complete** (`finishingCourse === true`)
   - All items completed
   - User is on the last item of the last module
   
2. ✅ **No certificate exists** (`!hasCertificate`)
   - User doesn't have a certificate for this course yet
   - Checked against `myCertificates` array
   
3. ✅ **Modal not shown this session** (`!hasShownCompletionModal`)
   - Prevents showing multiple times in same session
   - Resets when user navigates away and comes back

### State Management

```typescript
// Track if completion modal has been shown this session
const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);

// When showing the modal:
setHasShownCompletionModal(true); // Mark as shown
```

## User Scenarios

### Scenario 1: First Time Completing Course ✅
```
User completes last item
    ↓
"Finish Course" button appears
    ↓
User clicks button
    ↓
Completion modal + Feedback modal appear
    ↓
hasShownCompletionModal = true
    ↓
Button changes to "Next Lesson" (no longer shows "Finish Course")
```

### Scenario 2: Already Has Certificate ❌
```
User completed course previously
    ↓
Has certificate in myCertificates
    ↓
"Finish Course" button NEVER appears
    ↓
Only shows "Next Lesson" / "Next Assignment"
```

### Scenario 3: Completed in Same Session ❌
```
User completes course
    ↓
Sees completion modal
    ↓
hasShownCompletionModal = true
    ↓
User navigates within course
    ↓
"Finish Course" button does NOT appear again
    ↓
Only shows "Next Lesson"
```

### Scenario 4: Returns to Course Later ✅
```
User completed course in previous session
    ↓
Certificate was issued
    ↓
User returns to course
    ↓
hasCertificate = true
    ↓
"Finish Course" button NEVER appears
```

## Button Text Logic

```typescript
{shouldShowFinishButton ? 'Finish Course' : (nextItemIsAssignment ? 'Next Assignment' : 'Next Lesson')}
```

**Shows:**
- "Finish Course" - Only when all conditions met (first time completion)
- "Next Assignment" - When next item is an assignment
- "Next Lesson" - Default for completed items

## Benefits

### ✅ Professional UX
- Modal only appears once per course completion
- No duplicate celebrations
- Clear progression

### ✅ Prevents Confusion
- User knows they've already completed the course
- No repeated "Finish Course" prompts
- Consistent with certificate status

### ✅ Data Integrity
- Certificate check ensures accuracy
- Session tracking prevents duplicates
- Proper state management

### ✅ Performance
- Simple boolean checks
- No unnecessary API calls
- Efficient state updates

## Technical Details

### Certificate Check
```typescript
const hasCertificate = myCertificates.some(c => c.course?.id === courseId);
```
- Checks `myCertificates` array loaded on component mount
- Compares course IDs
- Returns true if certificate exists

### Session Tracking
```typescript
const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);
```
- Local component state
- Resets on page refresh
- Prevents showing modal multiple times in same session

### Combined Logic
```typescript
const shouldShowFinishButton = finishingCourse && !hasCertificate && !hasShownCompletionModal;
```
- All three conditions must be true
- Short-circuit evaluation for efficiency
- Clear, readable logic

## Edge Cases Handled

### ✅ User Refreshes Page
- `hasShownCompletionModal` resets to false
- BUT `hasCertificate` check prevents showing again
- Modal won't appear if certificate exists

### ✅ User Navigates Away and Back
- Same as refresh
- Certificate check is the primary guard
- Session state is secondary

### ✅ Certificate Issued Asynchronously
- Modal shows immediately on completion
- Certificate is issued in background
- Next time user visits, `hasCertificate` will be true

### ✅ Multiple Tabs
- Each tab has independent state
- Certificate check works across tabs
- No duplicate modals if certificate exists

## Testing Checklist

- [ ] Complete a course for the first time
- [ ] Verify "Finish Course" button appears
- [ ] Click button and see modals
- [ ] Verify button changes to "Next Lesson"
- [ ] Navigate to different content and back
- [ ] Verify "Finish Course" doesn't appear again
- [ ] Refresh the page
- [ ] Verify button doesn't show (certificate exists)
- [ ] Check certificates page for certificate
- [ ] Return to course in new session
- [ ] Verify "Finish Course" never appears again

## Code Changes Summary

### Added State
```typescript
const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);
```

### Updated Button Logic
```typescript
const hasCertificate = myCertificates.some(c => c.course?.id === courseId);
const shouldShowFinishButton = finishingCourse && !hasCertificate && !hasShownCompletionModal;
```

### Set Flag on Modal Show
```typescript
setHasShownCompletionModal(true); // Mark as shown to prevent showing again
```

## Future Enhancements

- Persist `hasShownCompletionModal` to localStorage for cross-session tracking
- Add analytics to track completion modal views
- Show different message for returning users
- Add "Review Course" button for completed courses
- Display completion date on completed courses
