# 🚀 Astro Image Optimization Implementation Guide

**For Team Members: How to Fix Performance Issues**

---

## 🚨 **Current Issues Detected**

The Performance Guardian found **10 critical image issues** totaling **~15MB of unoptimized images**. The biggest offender is `nans.png` at **3MB** - this single file is causing poor Core Web Vitals scores.

---

## 🎯 **Quick Fix: Replace Problem Images**

### **Step 1: Replace nans.png (URGENT)**

The file `src/assets/images/nans.png` appears to be placeholder content used across multiple components:

```astro
// Found in these files:
src/components/sections/HeroSection.astro
src/components/Polaroid.astro (used twice)
```

**Action Required:**
1. **Replace with actual production images**
2. **Use appropriate images for each context** (hero background vs polaroid content)

### **Step 2: Use Astro's Image Component**

Instead of plain `<img>` tags, use Astro's optimized Image component:

```astro
---
// ❌ OLD WAY (Manual import + plain img)
import heroImage from '~/assets/images/nans.png';
---

<img src={heroImage} alt="Hero" />
```

```astro
---
// ✅ NEW WAY (Astro Image component)
import { Image } from 'astro:assets';
import heroImage from '~/assets/images/hero-actual.jpg';
---

<Image 
  src={heroImage} 
  alt="Professional bond cleaning service"
  width={1200}
  height={600}
  loading="eager"
  format="webp"
/>
```

---

## 🛠️ **Astro Image Component Benefits**

When you use `<Image>` from `astro:assets`, Astro automatically:

✅ **Converts to modern formats** (WebP, AVIF)  
✅ **Generates responsive images** (multiple sizes)  
✅ **Optimizes file sizes** (up to 90% reduction)  
✅ **Adds proper caching headers**  
✅ **Prevents layout shift** (when width/height provided)  
✅ **Lazy loads by default** (improves page speed)

---

## 📝 **Component Migration Examples**

### **Example 1: HeroSection.astro Fix**

```astro
---
// BEFORE
import heroBG from '/src/assets/images/nans.png';
---

<section style={`background-image: url(${heroBG})`}>
  <!-- Hero content -->
</section>
```

```astro
---
// AFTER
import { Image } from 'astro:assets';
import heroBackground from '~/assets/images/hero-background.jpg';
---

<section class="relative">
  <Image 
    src={heroBackground}
    alt="Professional cleaning team at work"
    width={1920}
    height={1080}
    loading="eager"
    format="webp"
    class="absolute inset-0 w-full h-full object-cover"
  />
  <!-- Hero content with relative positioning -->
</section>
```

### **Example 2: Polaroid.astro Fix**

```astro
---
// BEFORE
import bathAfter from '~/assets/images/nans.png';
import tapAfter from '~/assets/images/nans.png';
---

<img src={bathAfter} alt="After cleaning" />
<img src={tapAfter} alt="After cleaning" />
```

```astro
---
// AFTER
import { Image } from 'astro:assets';
import bathAfterImage from '~/assets/images/bathroom-after.jpg';
import tapAfterImage from '~/assets/images/tap-after.jpg';
---

<Image 
  src={bathAfterImage}
  alt="Sparkling clean bathroom after professional bond cleaning"
  width={400}
  height={300}
  loading="lazy"
  format="webp"
/>

<Image 
  src={tapAfterImage}
  alt="Polished tap after thorough cleaning"
  width={400} 
  height={300}
  loading="lazy"
  format="webp"
/>
```

---

## 🏃‍♂️ **Quick Migration Script**

Here's a script to help identify and fix image usage:

```bash
# Find all files using the problematic image
grep -r "nans.png" src/

# Find all files using plain <img> tags that should use <Image>
grep -r "<img " src/ --include="*.astro"

# Run Performance Guardian to check progress
node scripts/performance-guardian.mjs
```

---

## 📏 **Image Sizing Guidelines**

### **When to use which sizes:**

```astro
<!-- Hero images (full width) -->
<Image width={1920} height={1080} format="webp" loading="eager" />

<!-- Polaroid/card images (medium) -->
<Image width={640} height={480} format="webp" loading="lazy" />

<!-- Thumbnails/icons (small) -->
<Image width={320} height={240} format="webp" loading="lazy" />

<!-- Logos/SVGs (keep original) -->
<Image width={200} height={100} format="svg" />
```

### **Performance-first loading strategy:**

```astro
<!-- Above-the-fold images (load immediately) -->
<Image loading="eager" />

<!-- Below-the-fold images (load when needed) -->
<Image loading="lazy" />

<!-- Critical images (preload) -->
<link rel="preload" as="image" href={heroImage} />
```

---

## 🎨 **Format Selection Guide**

```astro
<!-- Photos/complex images -->
<Image format="webp" />  <!-- Good compression, wide support -->
<Image format="avif" />  <!-- Best compression, modern browsers -->

<!-- Graphics/illustrations -->
<Image format="webp" />  <!-- Usually best for graphics too -->

<!-- Logos/icons -->
<Image format="svg" />   <!-- Vector graphics stay crisp -->

<!-- Let Astro decide (recommended) -->
<Image format={['avif', 'webp', 'jpeg']} />  <!-- Fallback chain -->
```

---

## 🚦 **Migration Priority**

### **🔥 Critical (Fix Today):**
1. **Replace nans.png** with actual production images
2. **Add Image component** to HeroSection.astro
3. **Fix Polaroid.astro** image dimensions

### **⚠️ Important (Fix This Week):**
1. **Add width/height** to all images (prevents layout shift)
2. **Convert remaining PNG files** to use Image component
3. **Review all placeholder content**

### **💡 Nice to Have (Fix Over Time):**
1. **Audit image sizes** for optimal dimensions
2. **Implement responsive breakpoints**
3. **Add preload hints** for critical images

---

## 🛡️ **Prevention: Build-Time Checks**

Add this to your build process to catch future issues:

```json
// package.json
{
  "scripts": {
    "prebuild": "node scripts/performance-guardian.mjs",
    "build": "astro build",
    "perf:check": "node scripts/performance-guardian.mjs"
  }
}
```

The Performance Guardian will:
- **Fail builds** if critical issues are found
- **Alert team members** about performance violations  
- **Provide specific fixes** for each issue
- **Track optimization progress** over time

---

## 📊 **Expected Results**

After implementing these fixes:

### **Before:**
- 🖼️ **Images**: 15MB+ total, poor formats
- ⚡ **LCP**: 33% (Poor)
- 📐 **CLS**: 45% (Poor)  
- 🎯 **Grade**: D (62%)

### **After:**
- 🖼️ **Images**: ~2MB total, optimized formats
- ⚡ **LCP**: 85% (Good)
- 📐 **CLS**: 85% (Good)
- 🎯 **Grade**: A (90%+)

---

## ❓ **FAQ**

**Q: Do I need to manually convert images to WebP?**  
A: No! Astro's Image component automatically generates WebP/AVIF versions.

**Q: What about browser compatibility?**  
A: Astro automatically provides fallbacks for older browsers.

**Q: Will this break existing functionality?**  
A: No, it's a drop-in replacement that improves performance.

**Q: How do I test the optimizations?**  
A: Run `node scripts/performance-guardian.mjs` to see improvements.

---

## 🚀 **Get Started Now**

1. **Run the Performance Guardian**: `node scripts/performance-guardian.mjs`
2. **Replace nans.png** with appropriate production images
3. **Update one component** to use Astro Image
4. **Check progress** and iterate

Need help? The Performance Guardian provides specific guidance for each issue! 💪
