# Quick Reference: Course Completion Flow

## User Journey

### Step 1: Complete Course
```
Student completes all modules and items
    ↓
Clicks "Finish Course" button on last item
```

### Step 2: Completion Celebration
```
✨ Completion Modal Appears
    - Animated trophy and sparkles
    - "Congratulations!" message
    - Course title displayed
    - Achievement stats (100%, Certified, Achievement)
    - Two action buttons:
      • "View Certificate" (primary)
      • "Continue Learning" (secondary)
```

### Step 3: Certificate Navigation
```
User clicks "View Certificate"
    ↓
Navigates to /app/certificates
    ↓
7-second timer starts (background)
```

### Step 4: Delayed Feedback Request
```
After 7 seconds on certificates page
    ↓
💬 Feedback Modal Appears
    - Star rating (1-5 stars)
    - Text area for review
    - Difficulty selector
    - Two action buttons:
      • "Skip for Now"
      • "Submit Feedback" (primary)
```

### Step 5: Feedback Submission
```
User submits feedback
    ↓
API call to save rating
    ↓
Success toast notification
    ↓
Modal closes
```

## Key Features

### Completion Modal
- **Animations**: Floating sparkles, pulsing trophy, gradient backgrounds
- **Stats Display**: 100% completion, certified badge, achievement icon
- **Responsive**: Works on all screen sizes
- **Accessible**: Proper ARIA labels and keyboard navigation

### Feedback Modal
- **Interactive Stars**: Hover effects, click to rate
- **Contextual Messages**: Different emoji/text based on rating
- **Validation**: Ensures all fields are filled
- **Character Counter**: Shows 0/500 for review text
- **Difficulty Options**: Easy (green), Medium (yellow), Hard (red)

## Configuration

### Delay Time
To change the feedback delay (currently 7 seconds):

```typescript
// In CourseViewer.tsx, line ~1232
feedbackDelayTimerRef.current = setTimeout(() => {
  setShowDelayedFeedbackModal(true);
}, 7000); // Change this value (in milliseconds)
```

### Animation Duration
To adjust animation speeds:

```css
/* In index.css */
.animate-float {
  animation: float 4s ease-in-out infinite; /* Change 4s */
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite; /* Change 2s */
}
```

## Conditional Logic

### When Completion Modal Shows
- Course progress is 100%
- User clicks "Finish Course" button
- Last item in last module is completed

### When Feedback Modal Shows
- User hasn't submitted feedback yet (`!feedbackSubmitted`)
- Course doesn't have user's rating (`!course?.my_rating`)
- 7 seconds after navigating to certificates page

### When Feedback Can Be Submitted
- Rating is selected (1-5 stars)
- Review text is not empty
- Difficulty is selected (easy/medium/hard)

## API Endpoints Used

```typescript
// Submit course rating
coursesApi.rateCourse(courseId, rating, review, difficulty)

// Parameters:
// - courseId: number
// - rating: number (1-5)
// - review: string
// - difficulty: 'easy' | 'medium' | 'hard'
```

## State Variables

```typescript
// Completion modal visibility
const [showCompletionModal, setShowCompletionModal] = useState(false);

// Feedback modal visibility (delayed)
const [showDelayedFeedbackModal, setShowDelayedFeedbackModal] = useState(false);

// Timer reference for cleanup
const feedbackDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

// Feedback submission status
const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
```

## Cleanup

Timer is automatically cleaned up:
1. When component unmounts
2. When user closes feedback modal
3. When feedback is submitted

```typescript
useEffect(() => {
  return () => {
    if (feedbackDelayTimerRef.current) {
      clearTimeout(feedbackDelayTimerRef.current);
    }
  };
}, []);
```

## Customization Tips

### Change Colors
Modals use CSS variables from your theme:
- `--primary`: Main brand color
- `--primary-foreground`: Text on primary color
- `--muted-foreground`: Secondary text
- `--background`: Modal background

### Add More Stats
In `CourseCompletionModal.tsx`, modify the stats grid:

```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Add your custom stat */}
  <div className="text-center">
    <div className="text-2xl font-bold text-primary">
      {/* Your value */}
    </div>
    <div className="text-xs text-muted-foreground mt-1">
      {/* Your label */}
    </div>
  </div>
</div>
```

### Modify Feedback Questions
In `FeedbackModal.tsx`, add more form fields in the `space-y-6` section.

## Troubleshooting

### Modal doesn't appear
- Check `showCompletionModal` state
- Verify course completion logic
- Check browser console for errors

### Feedback modal appears immediately
- Check timer delay value
- Verify conditional logic for showing modal
- Ensure timer is being set correctly

### Feedback submission fails
- Check API endpoint
- Verify authentication token
- Check network tab for error details
- Ensure all required fields are filled

## Testing Checklist

- [ ] Complete a course successfully
- [ ] Verify completion modal appears
- [ ] Check animations are smooth
- [ ] Click "View Certificate" button
- [ ] Verify navigation to certificates page
- [ ] Wait 7 seconds
- [ ] Confirm feedback modal appears
- [ ] Test star rating interaction
- [ ] Fill in review text
- [ ] Select difficulty level
- [ ] Submit feedback
- [ ] Verify success toast
- [ ] Check feedback saved in database
- [ ] Test "Skip for Now" button
- [ ] Test modal close (X button)
- [ ] Verify timer cleanup
- [ ] Test on mobile device
- [ ] Test in dark mode
- [ ] Test keyboard navigation
