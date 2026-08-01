# 🏙️ Civic Issue Tracker

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?style=for-the-badge&logo=capacitor)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![CodeQL](https://img.shields.io/badge/Security-CodeQL-blue?style=for-the-badge&logo=github)
![Gitleaks](https://img.shields.io/badge/Secret_Scanning-Gitleaks-orange?style=for-the-badge&logo=github)

A cross-platform web and mobile application for citizens and municipal governments to report, track, and resolve civic issues (potholes, streetlights, garbage, etc.) in real time. 

## ✨ Features

- **Cross-Platform:** Runs flawlessly on the web (Next.js) and as a native Android app (Capacitor).
- **Role-Based Access Control:** Distinct dashboards for Citizens, Department Admins, Government Officers, and Employee Staff.
- **Interactive Mapping:** Powered by Leaflet to drop pins exactly where issues exist.
- **Real-time Updates:** Stay informed on issue resolution via Supabase subscriptions and Firebase Push Notifications.
- **Gamification & Rewards:** Citizens earn civic points for verifying issues and helping the community.

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v20+)
- [npm](https://www.npmjs.com/)
- [Android Studio](https://developer.android.com/studio) (for Capacitor Android builds)

### 1. Clone the repository

```bash
git clone https://github.com/Modi-Krish/Civic-Issue-Tracker-.git
cd civic_issue_tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file to create your local `.env.local` file:

```bash
cp .env.example .env.local
```

Then, populate `.env.local` with your actual credentials. **Never commit your `.env.local` file or expose your keys.**

### 4. Run the Development Server (Web)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📱 Android Build (Capacitor)

This project uses Capacitor to compile the Next.js web app into a native Android APK.

1. Build the web app and sync it with Android:
   ```bash
   npm run build:android
   ```
2. Open Android Studio to build the APK/App Bundle:
   ```bash
   npm run cap:open
   ```

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started, our code of conduct, and our pull request process.

## 🛡️ Security

We take security seriously. Please review our [Security Policy](SECURITY.md) for details on how to responsibly report vulnerabilities.

## 📄 License

This project is licensed under the MIT License.
