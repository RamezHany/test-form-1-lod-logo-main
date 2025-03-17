# Frontend Developer Documentation

This document provides technical information for frontend developers who need to modify or extend the Event Registration System.

## Project Overview

The Event Registration System is built with Next.js 14, React, and Tailwind CSS. It uses a modern architecture with server components, client components, and API routes.

## Tech Stack Details

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form
- **Validation**: Zod
- **State Management**: React Context API
- **Authentication**: NextAuth.js
- **Data Fetching**: SWR
- **API Communication**: Fetch API

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

## Component Architecture

### Page Components

Page components are located in the `app` directory and follow Next.js App Router conventions:

- `page.tsx`: The main page component
- `layout.tsx`: Layout wrapper for the page
- `loading.tsx`: Loading state component
- `error.tsx`: Error handling component

### Reusable Components

Reusable components are organized in the `components` directory:

- **UI Components**: Buttons, inputs, cards, etc.
- **Layout Components**: Headers, footers, navigation, etc.
- **Form Components**: Form fields, validation, etc.
- **Data Display Components**: Tables, lists, etc.

## Styling Guidelines

The project uses Tailwind CSS for styling with the following conventions:

1. Use utility classes for most styling needs
2. Create custom components for complex UI elements
3. Use the `@apply` directive in CSS modules for repeated patterns
4. Follow mobile-first responsive design principles

Example of a styled component:

```tsx
// Button component example
export function Button({ children, variant = 'primary', ...props }) {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]}`} 
      {...props}
    >
      {children}
    </button>
  );
}
```

## Form Handling

The multi-step registration form is built using React Hook Form and Zod:

1. **Form Schema Definition**:
```tsx
import { z } from 'zod';

export const personalInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9]{10,11}$/, 'Phone number must be 10-11 digits'),
  // Additional fields...
});
```

2. **Form Component**:
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function PersonalInfoForm({ onSubmit, defaultValues }) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>
      {/* Additional fields... */}
      <button 
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Next
      </button>
    </form>
  );
}
```

## Multi-step Form Implementation

The multi-step form is implemented using React state management:

```tsx
'use client';

import { useState } from 'react';
import { PersonalInfoForm } from './PersonalInfoForm';
import { EventSpecificForm } from './EventSpecificForm';
import { ReviewForm } from './ReviewForm';
import { ProgressBar } from './ProgressBar';

export function RegistrationForm({ eventId, companyName }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  
  const handlePersonalInfoSubmit = (data) => {
    setFormData({ ...formData, ...data });
    setStep(2);
  };
  
  const handleEventSpecificSubmit = (data) => {
    setFormData({ ...formData, ...data });
    setStep(3);
  };
  
  const handleReviewSubmit = async () => {
    try {
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          companyName,
          ...formData,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      
      setStep(4); // Success step
    } catch (error) {
      console.error('Registration error:', error);
      // Handle error
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <ProgressBar currentStep={step} totalSteps={4} />
      
      {step === 1 && (
        <PersonalInfoForm 
          onSubmit={handlePersonalInfoSubmit} 
          defaultValues={formData}
        />
      )}
      
      {step === 2 && (
        <EventSpecificForm 
          onSubmit={handleEventSpecificSubmit}
          onBack={() => setStep(1)}
          defaultValues={formData}
          eventId={eventId}
        />
      )}
      
      {step === 3 && (
        <ReviewForm 
          formData={formData}
          onSubmit={handleReviewSubmit}
          onBack={() => setStep(2)}
        />
      )}
      
      {step === 4 && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600">Registration Successful!</h2>
          <p className="mt-2">Thank you for registering for this event.</p>
        </div>
      )}
    </div>
  );
}
```

## API Integration

The frontend communicates with the backend API using the Fetch API:

```tsx
// Example of fetching event data
export async function getEventData(companyName, eventId) {
  try {
    const response = await fetch(`/api/events?company=${companyName}&event=${eventId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch event data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching event data:', error);
    throw error;
  }
}

// Example of submitting registration data
export async function submitRegistration(registrationData) {
  try {
    const response = await fetch('/api/events/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}
```

## Authentication Integration

The frontend uses NextAuth.js for authentication:

```tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export function LoginButton() {
  return (
    <button onClick={() => signIn()}>
      Sign In
    </button>
  );
}

export function LogoutButton() {
  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  );
}

export function ProfileSection() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  
  if (status === 'unauthenticated') {
    return <LoginButton />;
  }
  
  return (
    <div>
      <p>Signed in as {session.user.name}</p>
      <LogoutButton />
    </div>
  );
}
```

## Event Details Page

The event details page displays information about an event and provides a registration button:

```tsx
// src/app/[company_name]/[event_id]/page.tsx
import { getEventData } from '@/lib/api';
import { RegistrationButton } from '@/components/RegistrationButton';

export default async function EventPage({ params }) {
  const { company_name, event_id } = params;
  const eventData = await getEventData(company_name, event_id);
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{eventData.title}</h1>
      
      <div className="mb-6">
        <img 
          src={eventData.image || '/placeholder-event.jpg'} 
          alt={eventData.title}
          className="w-full h-64 object-cover rounded-lg"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold">Date & Time</h3>
          <p>{new Date(eventData.date).toLocaleDateString()}</p>
          <p>{eventData.time}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold">Location</h3>
          <p>{eventData.location}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold">Organizer</h3>
          <p>{company_name}</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">About This Event</h2>
        <p className="whitespace-pre-line">{eventData.description}</p>
      </div>
      
      {eventData.agenda && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Agenda</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="whitespace-pre-line">{eventData.agenda}</pre>
          </div>
        </div>
      )}
      
      <div className="text-center mt-8">
        <RegistrationButton 
          companyName={company_name} 
          eventId={event_id} 
        />
      </div>
    </div>
  );
}
```

## Modifying the Registration Form

To add or modify fields in the registration form:

1. Update the Zod schema in `src/app/[company_name]/[event_id]/register/schemas.ts`
2. Modify the form component in `src/app/[company_name]/[event_id]/register/components/`
3. Update the API handler in `src/app/api/events/register/route.ts`

Example of adding a new field:

```tsx
// 1. Update schema
export const personalInfoSchema = z.object({
  // Existing fields...
  organization: z.string().optional(),
  // New field
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
});

// 2. Update form component
<div className="mb-4">
  <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
    Job Title
  </label>
  <input
    id="jobTitle"
    type="text"
    {...register('jobTitle')}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
  />
  {errors.jobTitle && (
    <p className="mt-1 text-sm text-red-600">{errors.jobTitle.message}</p>
  )}
</div>
```

## Adding Custom Event-specific Fields

To add custom fields for specific event types:

1. Create a new form component for the event type
2. Add conditional rendering based on event type
3. Update the schema to include the new fields

Example:

```tsx
// Event-specific form with conditional fields
export function EventSpecificForm({ eventType, ...props }) {
  // Base form fields for all events
  const baseFields = (
    <>
      {/* Common fields */}
    </>
  );
  
  // Conference-specific fields
  if (eventType === 'conference') {
    return (
      <form {...props}>
        {baseFields}
        <div className="mb-4">
          <label htmlFor="workshopPreference" className="block text-sm font-medium">
            Workshop Preference
          </label>
          <select
            id="workshopPreference"
            {...register('workshopPreference')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">Select a workshop</option>
            <option value="workshop1">Workshop 1: Introduction</option>
            <option value="workshop2">Workshop 2: Advanced</option>
          </select>
          {errors.workshopPreference && (
            <p className="mt-1 text-sm text-red-600">{errors.workshopPreference.message}</p>
          )}
        </div>
        {/* Other conference-specific fields */}
      </form>
    );
  }
  
  // Workshop-specific fields
  if (eventType === 'workshop') {
    return (
      <form {...props}>
        {baseFields}
        <div className="mb-4">
          <label htmlFor="experienceLevel" className="block text-sm font-medium">
            Experience Level
          </label>
          <select
            id="experienceLevel"
            {...register('experienceLevel')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {/* Error handling */}
        </div>
        {/* Other workshop-specific fields */}
      </form>
    );
  }
  
  // Default form for other event types
  return (
    <form {...props}>
      {baseFields}
      {/* Generic event fields */}
    </form>
  );
}
```

## Customizing UI Components

To modify the look and feel of the application:

1. Update the Tailwind configuration in `tailwind.config.js`
2. Modify the global styles in `src/app/globals.css`
3. Update the component styles in their respective files

Example of customizing the theme:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... other shades
          600: '#0284c7', // Primary button color
          700: '#0369a1',
        },
        secondary: {
          // ... secondary color palette
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '1rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
```

## Best Practices

1. **Component Organization**:
   - Keep components small and focused
   - Use composition over inheritance
   - Separate business logic from UI components

2. **State Management**:
   - Use React Context for global state
   - Keep form state in React Hook Form
   - Use SWR for data fetching and caching

3. **Performance Optimization**:
   - Use Next.js Image component for optimized images
   - Implement code splitting with dynamic imports
   - Memoize expensive calculations with useMemo and useCallback

4. **Accessibility**:
   - Use semantic HTML elements
   - Include proper ARIA attributes
   - Ensure keyboard navigation works
   - Maintain sufficient color contrast

5. **Responsive Design**:
   - Follow mobile-first approach
   - Test on multiple screen sizes
   - Use Tailwind's responsive modifiers consistently

## Troubleshooting

Common issues and their solutions:

1. **Form validation not working**:
   - Check that Zod schemas are correctly defined
   - Ensure the resolver is properly configured in useForm
   - Verify that error messages are being displayed

2. **API requests failing**:
   - Check browser console for error messages
   - Verify API route paths are correct
   - Ensure authentication tokens are being sent if required

3. **UI rendering issues**:
   - Clear browser cache and reload
   - Check for CSS conflicts
   - Verify that responsive classes are applied correctly

## Extending the Application

Guidelines for adding new features:

1. **Adding a new page**:
   - Create a new directory in the appropriate location in `src/app`
   - Add the required page components (page.tsx, layout.tsx, etc.)
   - Update navigation links if necessary

2. **Adding a new API endpoint**:
   - Create a new route handler in `src/app/api`
   - Implement the required HTTP methods (GET, POST, etc.)
   - Add validation and error handling

3. **Creating a new form**:
   - Define the form schema with Zod
   - Create the form component with React Hook Form
   - Implement form submission and error handling

## Deployment Considerations

When deploying changes:

1. Run the build process locally first to catch any errors
2. Test all features in a staging environment
3. Ensure environment variables are properly set
4. Consider using feature flags for major changes
5. Monitor performance and error rates after deployment 