# NOVISS OSINT Website Recreation

This is a clean HTML/CSS/JavaScript recreation of the NOVISS OSINT website from https://wrapupnews.wixstudio.com/my-site-1

## Features

✅ **Responsive Design** - Fully responsive on mobile, tablet, and desktop
✅ **Modern Navigation** - Sticky navbar with smooth scrolling
✅ **Hero Section** - Eye-catching hero with OSINT introduction
✅ **Personal Report Section** - Service offering with description
✅ **Rookie Suite Blog Grid** - Featured blog posts/articles
✅ **Services Cards** - Three main service offerings with icons
✅ **About Section** - Company description and mission
✅ **Footer** - Complete footer with links and social media
✅ **Smooth Animations** - Fade-in effects, hover animations, ripple effects
✅ **Mobile Menu** - Hamburger menu for mobile devices

## Project Structure

```
noviss-recreation/
├── index.html       # Main HTML file
├── styles.css       # All styling and responsive design
├── script.js        # JavaScript interactivity
└── README.md        # This file
```

## Getting Started

1. **Open the website**: Simply open `index.html` in your web browser
2. **No dependencies**: This project uses vanilla HTML, CSS, and JavaScript - no frameworks or build tools required
3. **Customize**: Edit the HTML to add your own content, images, and links

## Customization Guide

### Changing Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #000;           /* Main black */
    --secondary-color: #fff;         /* White */
    --accent-color: #0066cc;         /* Blue accent */
    --text-color: #333;              /* Text color */
}
```

### Adding Real Images
Replace placeholder divs with actual image tags:
```html
<!-- Replace this -->
<div class="placeholder-image">📊</div>

<!-- With this -->
<img src="path/to/image.jpg" alt="Description">
```

### Adding Blog Posts
Duplicate a blog card in the "ROOKIE SUITE" section and update the content:
```html
<article class="blog-card">
    <div class="blog-image">
        <img src="path/to/image.jpg" alt="Post title">
    </div>
    <h3>Your Blog Post Title</h3>
    <p class="blog-date">Date • Read time</p>
    <p class="blog-excerpt">Your post description here</p>
</article>
```

### Updating Navigation Links
Edit the nav menu in the HTML:
```html
<ul class="nav-menu">
    <li><a href="#your-section">Your Link</a></li>
</ul>
```

### Adding Footer Information
Update footer sections with your actual contact info and links:
```html
<div class="footer-section">
    <h3>Contact</h3>
    <ul>
        <li><a href="mailto:your-email@example.com">Email Us</a></li>
        <li><a href="tel:+1234567890">Call Us</a></li>
    </ul>
</div>
```

## Features Breakdown

### Navigation
- Sticky top navbar that follows scroll
- Responsive hamburger menu on mobile
- Smooth scrolling to sections

### Animations
- Fade-in animations on scroll
- Hover effects on cards and buttons
- Ripple effect on button clicks
- Float animation on hero icons

### Responsive Breakpoints
- **Desktop**: Full layout with multiple columns
- **Tablet** (≤ 768px): Adjusted grid and font sizes
- **Mobile** (≤ 480px): Single column layout

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- iOS Safari
- Android Chrome

## Performance Optimization

The project uses:
- Semantic HTML5
- CSS Grid and Flexbox for layout
- Intersection Observer for lazy animations
- Minimal JavaScript for smooth interactions

## Future Enhancements

Consider adding:
- Form validation for contact forms
- Lightbox/modal for blog posts
- Search functionality
- Back-to-top button
- Dark mode toggle
- Newsletter subscription
- Dynamic content loading

## License

This is a recreation for educational purposes.

## Questions?

Refer to the code comments for detailed explanations of specific sections.
