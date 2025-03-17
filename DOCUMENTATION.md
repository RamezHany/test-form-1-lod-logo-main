# نظام تسجيل الفعاليات - توثيق شامل

## نظرة عامة

نظام تسجيل الفعاليات هو تطبيق ويب متكامل يتيح للمسؤولين إدارة الشركات، وللشركات إدارة الفعاليات وتسجيلات المشاركين. يستخدم التطبيق Next.js كإطار عمل أساسي، مع Google Sheets API لتخزين البيانات وGitHub API لتخزين الصور.

## الهيكل التقني

### التقنيات المستخدمة

- **الواجهة الأمامية**: Next.js, React, Tailwind CSS
- **الواجهة الخلفية**: Next.js API Routes
- **المصادقة**: NextAuth.js
- **تخزين البيانات**: Google Sheets API
- **تخزين الصور**: GitHub API
- **التصدير**: jsPDF, xlsx
- **إدارة النماذج**: React Hook Form
- **التحقق من الصحة**: Zod

### هيكل المشروع

```
src/
├── app/                      # مكونات الصفحات والمسارات
│   ├── api/                  # نقاط نهاية API
│   │   ├── auth/             # مصادقة NextAuth
│   │   ├── companies/        # إدارة الشركات
│   │   └── events/           # إدارة الفعاليات والتسجيلات
│   ├── [company_name]/       # صفحات ديناميكية للشركات
│   │   └── [event_id]/       # صفحة عرض تفاصيل الفعالية
│   │       └── register/     # نموذج التسجيل متعدد الخطوات
│   ├── control_admin/        # لوحة تحكم المسؤول
│   ├── control_comp/         # لوحة تحكم الشركة
│   └── login/                # صفحة تسجيل الدخول
├── components/               # مكونات قابلة لإعادة الاستخدام
├── lib/                      # مكتبات ووظائف مساعدة
│   ├── auth.ts               # إعدادات المصادقة
│   ├── github.ts             # وظائف GitHub API
│   └── sheets.ts             # وظائف Google Sheets API
└── utils/                    # أدوات مساعدة
    └── export.ts             # وظائف تصدير البيانات
```

## نظام المصادقة (NextAuth)

### نظرة عامة على المصادقة

يستخدم النظام NextAuth.js لإدارة المصادقة، مع دعم نوعين من المستخدمين:
1. **المسؤولون (Admin)**: يمكنهم إدارة الشركات وعرض جميع الفعاليات والتسجيلات
2. **الشركات (Company)**: يمكنها إدارة فعالياتها الخاصة وعرض تسجيلات المشاركين

### تكوين NextAuth

ملف التكوين الرئيسي موجود في `src/lib/auth.ts`:

```typescript
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
        type: { label: 'Type', type: 'text' }, // 'admin' أو 'company'
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password || !credentials?.type) {
          return null;
        }

        try {
          if (credentials.type === 'admin') {
            // التحقق من بيانات اعتماد المسؤول من متغيرات البيئة
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
            // التحقق من بيانات اعتماد الشركة من Google Sheets
            const companies = await getSheetData('companies');
            
            // تخطي صف العنوان
            const companyData = companies.slice(1);
            
            // البحث عن الشركة بمطابقة اسم المستخدم
            const company = companyData.find(
              (row) => row[2] === credentials.username
            );
            
            if (company) {
              // التحقق من كلمة المرور
              const passwordMatch = await bcrypt.compare(
                credentials.password,
                company[3]
              );
              
              if (passwordMatch) {
                return {
                  id: company[0], // معرف الشركة
                  name: company[1], // اسم الشركة
                  image: company[4] || null, // رابط صورة الشركة
                  type: 'company',
                };
              }
            }
          }
        } catch (error) {
          console.error('Authentication error:', error);
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login', // صفحة تسجيل الدخول المخصصة
  },
  callbacks: {
    async jwt({ token, user }) {
      // إضافة معلومات المستخدم إلى الرمز المميز
      if (user) {
        token.id = user.id;
        token.type = user.type;
        if (user.image) {
          token.picture = user.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // إضافة معلومات المستخدم إلى الجلسة
      if (token) {
        session.user.id = token.id as string;
        session.user.type = token.type as string;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt', // استخدام استراتيجية JWT للجلسات
  },
  secret: process.env.NEXTAUTH_SECRET, // سر التشفير من متغيرات البيئة
};
```

### مسار API للمصادقة

يتم تكوين مسار API للمصادقة في `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### صفحة تسجيل الدخول

صفحة تسجيل الدخول المخصصة موجودة في `src/app/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<'admin' | 'company'>('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
        type,
      });
      
      if (result?.error) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }
      
      // إعادة التوجيه بناءً على نوع المستخدم
      if (type === 'admin') {
        router.push('/control_admin');
      } else {
        router.push('/control_comp');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  // ... باقي الكود لعرض نموذج تسجيل الدخول
}
```

### حماية الصفحات

يتم حماية الصفحات باستخدام useSession من NextAuth:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // إعادة التوجيه إذا لم يكن المستخدم مصادقًا
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // إعادة التوجيه إذا لم يكن المستخدم من النوع المطلوب
    if (status === 'authenticated' && session.user.type !== 'admin') {
      router.push('/');
      return;
    }
  }, [status, session, router]);

  // ... باقي الكود للصفحة المحمية
}
```

## تخزين البيانات (Google Sheets)

### نظرة عامة

يستخدم النظام Google Sheets كقاعدة بيانات لتخزين:
1. **بيانات الشركات**: في ورقة عمل تسمى "companies"
2. **بيانات الفعاليات**: كل شركة لها ورقة عمل خاصة بها
3. **بيانات التسجيل**: كل فعالية تُخزن كجدول داخل ورقة عمل الشركة

### هيكل البيانات

#### ورقة عمل الشركات (companies)

| ID | Name | Username | Password | Image |
|----|------|----------|----------|-------|
| company_1234 | شركة أ | company_a | [كلمة مرور مشفرة] | [رابط الصورة] |
| company_5678 | شركة ب | company_b | [كلمة مرور مشفرة] | [رابط الصورة] |

#### ورقة عمل الشركة (مثال: شركة أ)

تحتوي على جداول متعددة، كل جدول يمثل فعالية:

**فعالية 1**
| Name | Phone | Email | Gender | College | Status | National ID | Registration Date | Image |
|------|-------|-------|--------|---------|--------|-------------|-------------------|-------|
| أحمد | 0123456789 | ahmed@example.com | male | كلية الهندسة | student | 1234567890 | 2023-01-01T12:00:00Z | [رابط صورة الفعالية] |
| سارة | 0987654321 | sara@example.com | female | كلية الطب | graduate | 0987654321 | 2023-01-02T14:30:00Z | |

### وظائف Google Sheets API

الوظائف الرئيسية موجودة في `src/lib/sheets.ts`:

```typescript
import { google } from 'googleapis';

// تهيئة Google Sheets API
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// الحصول على جدول البيانات الرئيسي
export const getSpreadsheet = async () => {
  // ...
};

// الحصول على جميع أوراق العمل
export const getAllSheets = async () => {
  // ...
};

// الحصول على بيانات من ورقة عمل محددة
export const getSheetData = async (sheetName: string) => {
  // ...
};

// إضافة بيانات إلى ورقة عمل محددة
export const appendToSheet = async (sheetName: string, values: any[][]) => {
  // ...
};

// إنشاء ورقة عمل جديدة
export const createSheet = async (sheetName: string) => {
  // ...
};

// حذف صف من ورقة عمل
export const deleteRow = async (sheetName: string, rowIndex: number) => {
  // ...
};

// إنشاء جدول جديد في ورقة عمل (للفعاليات)
export const createTable = async (sheetName: string, tableName: string, headers: string[]) => {
  // ...
};

// الحصول على بيانات من جدول محدد في ورقة عمل
export const getTableData = async (sheetName: string, tableName: string) => {
  // ...
};

// إضافة بيانات إلى جدول محدد في ورقة عمل
export const addToTable = async (sheetName: string, tableName: string, rowData: any[]) => {
  // ...
};

// حذف جدول من ورقة عمل
export const deleteTable = async (sheetName: string, tableName: string) => {
  // ...
};
```

## تخزين الصور (GitHub API)

### نظرة عامة

يستخدم النظام GitHub API لتخزين:
1. **صور الشركات**: في مجلد "companies"
2. **صور الفعاليات**: في مجلد "events"

### وظائف GitHub API

الوظائف الرئيسية موجودة في `src/lib/github.ts`:

```typescript
import { Octokit } from '@octokit/rest';

// تهيئة Octokit مع رمز GitHub
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// رفع صورة إلى مستودع GitHub
export const uploadImage = async (
  fileName: string,
  fileContent: string,
  folderPath: string = 'images'
) => {
  // ...
};

// حذف صورة من مستودع GitHub
export const deleteImage = async (
  fileName: string,
  folderPath: string = 'images'
) => {
  // ...
};
```

## نقاط نهاية API

### إدارة الشركات

- **GET /api/companies**: الحصول على جميع الشركات (للمسؤولين فقط)
- **POST /api/companies**: إنشاء شركة جديدة (للمسؤولين فقط)
- **DELETE /api/companies?id={id}**: حذف شركة (للمسؤولين فقط)

### إدارة الفعاليات

- **GET /api/events?company={companyName}**: الحصول على جميع فعاليات شركة
- **POST /api/events**: إنشاء فعالية جديدة
- **DELETE /api/events?company={companyName}&event={eventName}**: حذف فعالية

### إدارة التسجيلات

- **GET /api/events/registrations?company={companyName}&event={eventName}**: الحصول على تسجيلات فعالية
- **POST /api/events/register**: تسجيل مشارك في فعالية

## واجهات المستخدم

### الصفحة الرئيسية

صفحة بسيطة تحتوي على روابط للوحات التحكم وصفحة تسجيل الدخول.

### صفحة تسجيل الدخول

تتيح للمستخدمين تسجيل الدخول كمسؤول أو شركة.

### لوحة تحكم المسؤول

- عرض قائمة الشركات
- إضافة شركة جديدة
- حذف شركة
- عرض فعاليات شركة
- عرض تسجيلات فعالية
- تصدير التسجيلات بتنسيق PDF أو CSV

### لوحة تحكم الشركة

- عرض قائمة الفعاليات
- إضافة فعالية جديدة
- حذف فعالية
- عرض تسجيلات فعالية
- تصدير التسجيلات بتنسيق PDF أو CSV

### نموذج تسجيل الفعالية

نموذج عام يتيح للمشاركين التسجيل في فعالية محددة.

## إعداد المشروع

### متطلبات النظام

- Node.js 18+ و npm
- حساب Google Cloud Platform مع تفعيل Sheets API
- حساب GitHub مع مستودع لتخزين الصور

### متغيرات البيئة

إنشاء ملف `.env.local` في المجلد الرئيسي بالمتغيرات التالية:

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

### التثبيت

1. استنساخ المستودع
2. تثبيت التبعيات:
   ```bash
   npm install
   ```
3. تشغيل خادم التطوير:
   ```bash
   npm run dev
   ```
4. فتح [http://localhost:3000](http://localhost:3000) في المتصفح

## الاستخدام

### وصول المسؤول

1. الذهاب إلى `/login` واختيار "Admin"
2. إدخال بيانات اعتماد المسؤول من ملف `.env.local`
3. إدارة الشركات وعرض فعالياتها وتسجيلاتها

### وصول الشركة

1. الذهاب إلى `/login` واختيار "Company"
2. إدخال بيانات اعتماد الشركة (التي أنشأها المسؤول)
3. إدارة الفعاليات وعرض التسجيلات

### تسجيل الفعالية

1. الوصول إلى صفحة تفاصيل الفعالية على `/{company_name}/{event_id}`
2. الاطلاع على تفاصيل الفعالية والنقر على زر "التسجيل" للبدء في عملية التسجيل
3. إكمال نموذج التسجيل متعدد الخطوات مع إدخال المعلومات الشخصية والمعلومات الخاصة بالفعالية
4. مراجعة المعلومات المدخلة والتأكيد عليها
5. استلام تأكيد التسجيل الناجح

## نظام التسجيل متعدد الخطوات

### نظرة عامة على نظام التسجيل

تم تطوير نظام تسجيل متعدد الخطوات لتحسين تجربة المستخدم وتبسيط عملية جمع البيانات. يتكون النظام من عدة خطوات:

1. **معلومات المشارك الأساسية**: الاسم، البريد الإلكتروني، رقم الهاتف، إلخ.
2. **معلومات خاصة بالفعالية**: أسئلة مخصصة تعتمد على نوع الفعالية ومتطلباتها.
3. **المراجعة والتأكيد**: مراجعة جميع المعلومات المدخلة قبل الإرسال النهائي.

### تنفيذ نظام التسجيل

تم استخدام React Hook Form مع Zod للتحقق من صحة البيانات في الوقت الفعلي. يتميز النظام بما يلي:

- **واجهة سهلة الاستخدام**: تصميم بسيط وواضح يسهل على المستخدمين إكمال عملية التسجيل.
- **التحقق من الصحة في الوقت الفعلي**: يتم التحقق من صحة المدخلات فوراً لتقليل الأخطاء.
- **حفظ التقدم**: يتم حفظ بيانات المستخدم مؤقتاً أثناء التنقل بين الخطوات.
- **تصميم متجاوب**: يعمل بشكل جيد على جميع أحجام الشاشات، بما في ذلك الأجهزة المحمولة.

### مكونات صفحة التسجيل

- **شريط التقدم**: يوضح للمستخدم موقعه في عملية التسجيل.
- **أزرار التنقل**: للتنقل بين الخطوات (التالي، السابق).
- **نماذج مخصصة**: تعرض حقول مختلفة بناءً على متطلبات الفعالية.
- **رسائل الخطأ**: تعرض رسائل واضحة عند إدخال بيانات غير صحيحة.
- **صفحة تأكيد**: تعرض رسالة نجاح بعد إكمال التسجيل.

## صفحة تفاصيل الفعالية

### نظرة عامة على صفحة الفعالية

تم تطوير صفحة عرض تفاصيل الفعالية لتقديم جميع المعلومات الضرورية للمشاركين المحتملين. تتضمن الصفحة:

- **معلومات أساسية**: عنوان الفعالية، التاريخ، الوقت، المكان.
- **وصف مفصل**: شرح تفصيلي عن الفعالية وأهدافها.
- **صور**: صور توضيحية للفعالية أو للفعاليات السابقة.
- **جدول الأعمال**: قائمة بالأنشطة والمواعيد.
- **المتحدثون**: معلومات عن المتحدثين في الفعالية (إن وجدوا).
- **زر التسجيل**: زر واضح للانتقال إلى صفحة التسجيل.

### تنفيذ صفحة الفعالية

تم تصميم الصفحة باستخدام Tailwind CSS لضمان واجهة جذابة وسهلة الاستخدام:

- **تصميم متجاوب**: يعمل بشكل جيد على جميع أحجام الشاشات.
- **تحميل سريع**: تحسين أداء الصفحة لتحميل سريع.
- **سهولة التنقل**: هيكل واضح للمعلومات يسهل على المستخدمين العثور على ما يبحثون عنه.
- **تكامل مع نظام التسجيل**: انتقال سلس إلى صفحة التسجيل.

## الخلاصة

نظام تسجيل الفعاليات هو حل متكامل يتيح للمسؤولين والشركات إدارة الفعاليات والتسجيلات بسهولة. باستخدام Google Sheets كقاعدة بيانات وGitHub لتخزين الصور، يوفر النظام حلاً فعالاً من حيث التكلفة وسهل الصيانة. تم تحسين تجربة المستخدم من خلال تطوير نظام تسجيل متعدد الخطوات وصفحة تفاصيل فعالية شاملة، مما يجعل العملية أكثر سلاسة وفعالية للمشاركين والمنظمين على حد سواء. 