# Life Control

Life Control is an offline-first Android personal growth management app built with Kotlin, Jetpack Compose, Material 3, and Room Database.

It helps users manage daily tasks, income and expenses, savings goals, learning progress, weekly and monthly reviews, daily reflection, local reminders, and personal growth tracking in one focused Android experience.

## Overview

Life Control was designed as a personal growth and independence tracker. The app focuses on discipline, financial awareness, learning consistency, and self-reflection.

The application works fully offline. It does not require login, Firebase, cloud storage, remote analytics, or external AI APIs in the current release.

## Key Features

- Home dashboard with progress overview
- Task manager with pending and completed tasks
- Income and expense tracker
- Savings goal progress tracking
- Learning pathway tracker
- Daily reflection journal
- Local productivity analysis
- Weekly performance review
- Monthly performance review
- CSV data export
- JSON backup and restore
- Local Android reminders
- Demo data mode
- Screenshot / portfolio mode
- Privacy and data transparency page
- Manual QA checklist
- Danger Zone reset tools

## Screens / Modules

- Home Dashboard
- Task Manager
- Money Tracker
- Learning Tracker
- Reflection Journal
- Weekly Review
- Monthly Review
- Settings
- About App
- Privacy & Data
- Project Summary
- Release QA Checklist

## Tech Stack

- Kotlin
- Jetpack Compose
- Material 3
- Room Database
- DAO + Repository Pattern
- Single-Activity Architecture
- Local-first Storage

## Architecture

Life Control uses a local-first Android architecture.

Core data is stored in a local Room SQLite database. DAO and Repository patterns are used to separate data access from UI logic. Jetpack Compose powers the interface, while Material 3 provides the visual design system.

The app is designed around offline reliability, privacy transparency, and long-term personal data ownership.

## Offline-First Privacy Model

Life Control is designed to run locally on the user's device.

- No login required
- No Firebase
- No cloud database
- No Gemini API in this version
- No remote analytics
- Local Room database storage
- User-controlled CSV export
- User-controlled JSON backup and restore
- Local Android reminders only
- User-controlled data reset tools

## Version History

### V1.0
- Core dashboard
- Task manager
- Money tracker
- Learning tracker
- Reflection journal
- Local Room persistence

### V1.1
- Weekly review
- Dashboard insights
- CSV export
- Empty state improvements

### V1.2
- JSON backup and restore
- Monthly review
- Local reminders
- Danger Zone reset tools
- Simple visual analytics

### V1.2.1
- Backup and restore hardening
- Android notification permission handling
- Safer reset confirmation
- Manual QA checklist
- Data integrity improvements

### V1.3
- First launch onboarding
- About page
- Privacy and data page
- Demo data mode
- Screenshot mode
- Portfolio README generator

### V1.3.1
- Final release preparation
- Version polish
- Documentation polish
- Portfolio packaging

## Current Status

Version: 1.3.1 Final Release Candidate  
Version Code: 2  
Status: Core features completed and running locally

## Future Roadmap

- Gemini-powered journal analysis
- AI weekly coaching
- Improved visual analytics
- Optional encrypted backup
- Play Store internal testing

## Developer

YAP SHI XIAN
