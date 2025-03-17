# Event Registration System

A comprehensive event registration system built with Next.js, Google Sheets API, and GitHub API. This system allows administrators to manage companies, and companies to manage their events and registrations.

## Features

- **Admin Dashboard**
  - Manage companies (add, view, delete)
  - View company events and registrations
  - Export registrations to PDF or CSV

- **Company Dashboard**
  - Manage events (add, view, delete)
  - View event registrations
  - Export registrations to PDF or CSV

- **Event Registration**
  - Public registration forms for events
  - Form validation
  - Responsive design
  - Multi-step registration process
  - Custom form fields based on event requirements
  - Real-time validation
  - Mobile-friendly interface

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Authentication**: NextAuth.js
- **Data Storage**: Google Sheets API
- **Image Storage**: GitHub API
- **Export**: jsPDF, xlsx
- **Form Handling**: React Hook Form
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Platform account with Sheets API enabled
- GitHub account with a repository for image storage

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@example.com
GOOGLE_PRIVATE_KEY="your-private-key"
GOOGLE_SHEET_ID=your-sheet-id

# GitHub API
GITHUB_TOKEN=your-github-token
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=your-repo-name

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_password

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Admin Access

1. Go to `/login` and select "Admin"
2. Enter the admin credentials from your `.env.local` file
3. Manage companies and view their events and registrations

### Company Access

1. Go to `/login` and select "Company"
2. Enter the company credentials (created by admin)
3. Manage events and view registrations

### Event Registration

1. Access the event registration form at `/{company_name}/{event_id}`
2. View event details and click "Register" to begin the registration process
3. Complete the multi-step registration form with personal and event-specific information
4. Submit the form and receive confirmation of successful registration

## Project Structure

```
src/
├── app/                      # Page components and routes
│   ├── api/                  # API endpoints
│   ├── control_admin/        # Admin dashboard
│   ├── control_comp/         # Company dashboard
│   ├── login/                # Login page
│   └── [company_name]/       # Dynamic company pages
│       └── [event_id]/       # Event registration forms
│           └── register/     # Multi-step registration process
├── components/               # Reusable components
├── lib/                      # Helper libraries
└── utils/                    # Utility functions
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
