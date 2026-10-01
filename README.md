# 📱 Stride Specs — Mobile Wheelchair HCPCS Specifier (PWA)

A fast, mobile-first Progressive Web App designed for ATPs, Physical Therapists, and Seating Specialists to quickly click through wheelchair specs, configure parts with clinical justifications, and email the complete order sheet directly to themselves.

Built directly from the **Stride Sidekick 2.0** wheelchair catalog (`catalog.py`), containing all 34 power, manual, and tilt-in-space wheelchair bases, manufacturer order form options, cushions, backrests, and 117+ HCPCS medical necessity rationales.

---

## ✨ Features

- **👤 Patient Header**: Enter patient name, evaluation date, and optional diagnosis/clinical notes right at the top.
- **♿ 34 Wheelchair Models**: Seamlessly toggle between:
  - ⚡ **Power Chairs** (Quantum Edge 3/4, Permobil M3/F3 Corpus, Quickie Q500/Q700, etc.)
  - 🦼 **Tilt-in-Space Chairs** (Quickie IRIS, PDG Stellar, Power Plus STP, etc.)
  - ♿ **Manual Ultralight Chairs** (Motion Composites Helio, Quickie 2/QS5 X, Tilite, etc.)
- **🔧 Rapid Spec Picker**: Tap through Chair Options, Cushions, Backrests, and Accessories with real-time search and filter chips.
- **💡 Built-In Clinical Justifications**: Every HCPCS item automatically pulls Medicare/Medicaid clinical justification rationales with 1-tap selection or custom therapist notes.
- **✉️ 1-Tap Email Export**: Pre-fills your email app (`mailto:`) with formatted patient details, itemized clinical specs, and exact CMN Section D billing strings.
- **📋 Multiple Export Options**: 1-tap Copy to Clipboard, native mobile Share Sheet (`navigator.share`), and print-ready PDF view.
- **💾 Auto-Save & Offline**: All changes auto-save in real-time to your phone's storage. Full Service Worker caching means it works **100% offline** in clinics or patient homes with zero cell signal.
- **🌙 Dark / Light Theme**: Ergonomic, high-contrast dark theme by default, with instant light mode toggle.

---

## 🚀 How to Host on GitHub Pages (Free PWA Hosting)

You can host this app for free on GitHub Pages in under 2 minutes:

### Option A: Upload via GitHub Web (Easiest — No Git required!)

1. Go to [github.com](https://github.com) and log in.
2. Click **New Repository** (green button).
3. Name your repository (e.g., `stride-specs` or `wheelchair-specs`).
4. Set visibility to **Public** (required for free GitHub Pages).
5. Leave "Add a README file" unchecked and click **Create repository**.
6. On the new repository page, click **"uploading an existing file"**.
7. Drag and drop all files from this folder (`stride-specs-pwa`) into the upload box:
   - `index.html`
   - `app.css`
   - `app.js`
   - `data.js`
   - `manifest.json`
   - `sw.js`
   - `icons/` folder (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.svg`)
8. Click **Commit changes**.
9. Go to repository **Settings** → **Pages** (on the left menu).
10. Under **Build and deployment** > **Branch**:
    - Select branch: `main`
    - Folder: `/ (root)`
    - Click **Save**.
11. In about 30 seconds, GitHub will give you your live URL:
    `https://<your-username>.github.io/<repository-name>/`

---

### Option B: Push via Git Command Line

If you have `git` installed on your computer:

```bash
cd "stride-specs-pwa"
git init
git add .
git commit -m "Initial commit of Stride Specs PWA"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
Then turn on GitHub Pages in **Settings → Pages** as described in Step 9-10 above.

---

## 📲 How to Install as an App on Your Phone (PWA)

Once your GitHub Pages link is live:

### On iPhone (Safari):
1. Open your GitHub Pages link in **Safari**.
2. Tap the **Share** button (box with an arrow pointing up at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add** in the top right.
5. The **Stride Specs** wheelchair icon will now appear on your home screen and open full-screen like a native app without browser bars!

### On Android (Chrome):
1. Open your GitHub Pages link in **Chrome**.
2. Tap the three dots (⋮) menu in the top right.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. The app installs to your app drawer and home screen.

---

## 📋 How It Works in Clinic / Home Evals

1. **Enter Patient Name**: Type the patient's name at the top.
2. **Set Your Email (One-time setup)**: Type your email in the "My Email" field or tap the ⚙️ Settings gear. The app remembers your email address forever on your device.
3. **Select Wheelchair Base**: Tap Manual, Tilt, or Power, then pick the wheelchair model.
4. **Tap Through Specs**:
   - Tap any part card to select it.
   - Adjust quantities with `[−]` and `[+]`.
   - Tap **"Edit"** on any part's justification badge to select from Medicare/Medicaid clinical justifications or type a custom note.
5. **Tap "Review & Email ✉️"**:
   - Tap **"✉️ Open in Email App"**: Automatically opens your phone's email app (Apple Mail, Gmail, Outlook) with the recipient, subject line, itemized clinical justification list, and CMN Section D billing lines already filled out!
   - Tap **Send** and you're done!
6. **Start Next Patient**: Tap ✨ in the top header to start a fresh evaluation for your next patient (prior evaluations are safely stored in the 📁 History drawer).

---

## 📁 File Structure

```text
stride-specs-pwa/
├── index.html           # Main semantic mobile PWA interface
├── app.css              # Mobile-first design system (dark/light mode, safe area padding)
├── app.js               # Reactive application logic, state, email/export engine
├── data.js              # Complete 34 models, parts, cushions, and justifications
├── manifest.json        # PWA standalone manifest configuration
├── sw.js                # Offline Service Worker caching
├── icons/               # High-res PWA icons & Apple Touch icon
│   ├── favicon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── README.md            # Setup & deployment guide
```
