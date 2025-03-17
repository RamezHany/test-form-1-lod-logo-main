import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getSheetData } from './sheets';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        type: { label: 'Type', type: 'text' }, // 'admin' or 'company'
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password || !credentials?.type) {
          return null;
        }

        try {
          if (credentials.type === 'admin') {
            // Check admin credentials from environment variables
            const adminUsername = process.env.ADMIN_USERNAME;
            const adminPassword = process.env.ADMIN_PASSWORD;

            if (
              credentials.username === adminUsername &&
              credentials.password === adminPassword
            ) {
              return {
                id: 'admin',
                name: 'Admin',
                email: 'admin@example.com',
                type: 'admin',
              };
            }
          } else if (credentials.type === 'company') {
            // Check company credentials from Google Sheets
            const companies = await getSheetData('companies');
            
            // Skip header row
            const companyData = companies.slice(1);
            
            // Find the company with matching username
            const company = companyData.find(
              (row) => row[2] === credentials.username
            );
            
            if (company) {
              // Check if company is enabled
              const status = company[5] || 'enabled';
              if (status === 'disabled') {
                console.log(`Company ${company[1]} is disabled, login rejected`);
                throw new Error('CompanyDisabled');
              }
              
              // Check password
              const passwordMatch = await bcrypt.compare(
                credentials.password,
                company[3]
              );
              
              if (passwordMatch) {
                return {
                  id: company[0], // Company ID
                  name: company[1], // Company name
                  image: company[4] || null, // Company image URL
                  type: 'company',
                  status: status,
                };
              }
            }
          }
        } catch (error) {
          console.error('Authentication error:', error);
          // Rethrow specific errors
          if (error instanceof Error && error.message === 'CompanyDisabled') {
            throw new Error('CompanyDisabled');
          }
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.type = user.type;
        if (user.image) {
          token.picture = user.image;
        }
        if (user.status) {
          token.status = user.status;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.type = token.type as string;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
        if (token.status) {
          session.user.status = token.status as string;
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    id: string;
    type: string;
    image?: string;
    status?: string;
  }
  
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      type: string;
      status?: string;
    };
  }
} 