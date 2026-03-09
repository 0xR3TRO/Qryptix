<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-HTML%20%7C%20CSS%20%7C%20JS-blueviolet?style=for-the-badge" alt="Built With">
  <img src="https://img.shields.io/badge/Offline-100%25-brightgreen?style=for-the-badge" alt="Offline">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Encryption-AES--256--GCM-orange?style=for-the-badge" alt="Encryption">
</p>

# Qryptix — QR & Security Toolkit

> A modern, offline-first QR code generator, password vault, TOTP authenticator, and password generator — all running in your browser with zero dependencies.

---

## Overview

**Qryptix** is an advanced web application built with pure HTML, CSS, and JavaScript (no frameworks). It combines four powerful tools into one seamless interface:

1. **QR Code Generator** — Generate high-quality QR codes from text, URLs, emails, phone numbers, Wi-Fi credentials, vCards, events, and more.
2. **Password Vault** — Securely store and manage passwords with AES-256-GCM encryption.
3. **TOTP Authenticator** — Generate time-based one-time passwords (2FA) following RFC 6238.
4. **Password Generator** — Create strong, customizable passwords with cryptographic randomness.

Everything runs locally. No servers, no tracking, no API calls. Your data never leaves your browser.

---

## Features

### QR Code Generator

- **8 data types**: Auto-detect, Text, URL, Email, Phone, Wi-Fi, vCard, Calendar Events
- **Error correction levels**: L (7%), M (15%), Q (25%), H (30%)
- **Customizable size**: 128px to 1024px
- **Color personalization**: Custom foreground and background colors
- **Center logo overlay**: Upload any image
- **Export as PNG, SVG, or copy to clipboard**
- **Batch generation**: Multiple QR codes at once
- **Live preview**: Real-time QR code generation as you type
- **History**: All generated QR codes saved locally

### Password Vault

- **AES-256-GCM encryption** via Web Crypto API
- **PBKDF2 key derivation** (600,000 iterations, SHA-256)
- **Master password** protection
- **Categories**: General, Social Media, Finance, Work, Email, Development, Other
- **Color-coded labels** for visual organization
- **Search and filter** entries
- **Auto-lock** after configurable inactivity timeout
- **One-click password copy**

### TOTP Authenticator

- **RFC 6238 compliant** implementation
- **Algorithms**: SHA-1, SHA-256, SHA-512
- **Configurable**: 6 or 8 digit codes, custom period (10–120s)
- **Real-time countdown** with animated timer
- **Click-to-copy** codes

### Password Generator

- **Random passwords**: Full character set control
- **Memorable passphrases**: Word-based with customizable separator
- **PIN generator**: Numeric-only mode
- **Length**: 4 to 128 characters
- **Strength meter**: Real-time password strength evaluation
- **Exclude ambiguous characters** (0, O, l, 1, I)
- **Custom character sets**

### General

- **Dark and light themes** with localStorage persistence
- **Customizable accent color**
- **Fully responsive** design (mobile, tablet, desktop)
- **Animated transitions** and clean UI
- **ARIA attributes** for accessibility
- **Data export/import** (JSON backup)
- **Toast notifications** for user feedback
- **Works offline** — no internet required
- **Compatible with Live Server**

---

## Repository Structure

```
Qryptix/
├── index.html              # Main application (SPA)
├── assets/
│   ├── styles.css          # Complete application styles
│   ├── script.js           # All modules (QR, Vault, TOTP, PasswordGen, UI)
│   └── icons/              # Icon assets
├── landing/
│   └── index.html          # Landing/presentation page
├── docs/
│   └── documentation.md    # Technical documentation
├── README.md               # This file
└── .git/                   # Git repository
```

---

## Getting Started

### Prerequisites

- Any modern web browser (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- (Optional) A local server like [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for VS Code

### Running Locally

**Option 1 — Live Server (Recommended)**

1. Open the project folder in VS Code
2. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
3. Right-click `index.html` → "Open with Live Server"

**Option 2 — Direct File**

1. Simply open `index.html` in your browser

**Option 3 — Python HTTP Server**

```bash
cd Qryptix
python3 -m http.server 8080
# Open http://localhost:8080
```

**Option 4 — Node.js**

```bash
npx serve .
```

---

## Modules

### `QR` — QR Code Engine

Pure JavaScript implementation of QR code generation following ISO 18004. Handles byte-mode encoding, Reed-Solomon error correction, masking optimization, and format/version information placement.

### `QRRenderer` — Rendering Engine

Renders QR code matrices to HTML Canvas (for PNG export and display) and generates SVG markup (for vector export).

### `Toast` — Notification System

Provides animated toast notifications with four types: success, error, info, warning. Auto-dismisses after 3 seconds.

### `Settings` — Preferences Manager

Manages all user settings with localStorage persistence. Supports theme, accent color, default QR parameters, live preview toggle, and auto-lock timeout.

### `DataDetector` — Input Analyzer

Automatically detects the type of input data (URL, email, phone number) using regex pattern matching.

### `CryptoUtils` — Encryption Layer

Wraps the Web Crypto API for AES-256-GCM encryption with PBKDF2 key derivation. Handles salt and IV generation, key derivation, encryption, and decryption.

### `Vault` — Password Manager

Full password vault with encrypted storage, master password authentication, CRUD operations, auto-lock, search, and category filtering.

### `TOTP` — Authenticator

Implements RFC 6238 TOTP generation using HMAC-SHA1/256/512 via Web Crypto API. Handles Base32 decoding, counter calculation, and dynamic truncation.

### `PasswordGen` — Password Creator

Generates cryptographically secure passwords using `crypto.getRandomValues()`. Supports random, memorable (word-based), and PIN modes with customizable parameters.

### `UI` — Interface Controller

Manages all DOM interactions, tab navigation, form handling, rendering, and user events.

---

## Use Cases

### Marketing & Business

- Generate QR codes for product packaging, business cards, flyers, and posters
- Create branded QR codes with custom colors and logo
- Batch generate QR codes for marketing campaigns

### Events & Conferences

- Generate event QR codes with date, time, and location
- Create vCard QR codes for networking
- Share Wi-Fi credentials via QR code at venues

### Authentication & Security

- Use TOTP authenticator for 2FA on any service
- Store complex passwords securely in the vault
- Generate strong passwords for every account

### Wi-Fi Sharing

- Create QR codes for home/office Wi-Fi passwords
- Support for WPA/WPA2, WEP, and open networks
- Hidden network support

### Development & IT

- Generate QR codes for testing mobile apps
- Store API keys and tokens securely
- Quick QR code generation for localhost URLs

---

## Security

### Encryption Standards

| Component         | Algorithm                | Details                     |
| ----------------- | ------------------------ | --------------------------- |
| Vault Encryption  | AES-256-GCM              | Web Crypto API              |
| Key Derivation    | PBKDF2                   | SHA-256, 600,000 iterations |
| Password Hashing  | SHA-256                  | With application salt       |
| Random Generation | crypto.getRandomValues() | CSPRNG                      |
| TOTP              | HMAC-SHA1/256/512        | Web Crypto API              |

### Data Privacy

- **All data stays local** — nothing is sent to any server
- **No analytics or tracking**
- **No external API calls** — QR codes generated entirely offline
- **Encrypted vault** — passwords are encrypted at rest
- **No CDN dependencies** — all code is self-contained

---

## Future Improvements

- [ ] **QR Code Scanner** — Decode QR codes from camera or image upload
- [ ] **PWA / Offline Mode** — Full Progressive Web App with service worker
- [ ] **API Mode** — RESTful API for programmatic QR code generation
- [ ] **QR Code from Image** — Generate QR codes embedding images
- [ ] **Custom QR Shapes** — Rounded modules, dot patterns, eye customization
- [ ] **Biometric Unlock** — WebAuthn / fingerprint for vault access
- [ ] **Encrypted Cloud Sync** — Optional encrypted backup to cloud
- [ ] **Multi-language Support** — i18n for international users
- [ ] **QR Code Templates** — Pre-built designs for common use cases
- [ ] **Password Health Dashboard** — Detect weak/reused/compromised passwords

---

## Browser Compatibility

| Browser | Minimum Version | Status          |
| ------- | --------------- | --------------- |
| Chrome  | 90+             | ✅ Full Support |
| Firefox | 90+             | ✅ Full Support |
| Safari  | 15+             | ✅ Full Support |
| Edge    | 90+             | ✅ Full Support |
| Opera   | 76+             | ✅ Full Support |

### Required Browser APIs

- Web Crypto API (SubtleCrypto)
- Canvas API
- Clipboard API
- localStorage
- TextEncoder / TextDecoder
- CSS Custom Properties

---

## License

This project is open source. Created by [0xR3TR0](https://github.com/0xR3TRO).

---

<p align="center">
  <strong>Qryptix</strong> — Generate. Secure. Authenticate.<br>
  <sub>Built with ❤️ using pure HTML, CSS, and JavaScript</sub>
</p>
