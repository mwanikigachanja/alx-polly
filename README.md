# ALX Polly: A Secure Polling Application

Welcome to ALX Polly, a full-stack polling application built with Next.js, TypeScript, and Supabase. This project demonstrates modern web development practices with a strong emphasis on security, user experience, and code quality.

## 🎯 About the Application

ALX Polly is a comprehensive polling platform that allows users to create, share, and participate in polls. The application showcases best practices in modern web development and includes robust security measures.

### Key Features

- **🔐 Secure Authentication**: User registration and login with comprehensive validation
- **📊 Poll Management**: Create, edit, delete, and share polls with QR codes
- **🗳️ Voting System**: Cast votes with duplicate prevention and validation
- **👤 User Dashboard**: Personalized interface for managing polls and viewing results
- **🛡️ Security Features**: Rate limiting, input validation, and authorization controls
- **📱 Responsive Design**: Mobile-first design with modern UI components

### Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety
- **Backend & Database**: [Supabase](https://supabase.io/) for authentication and data storage
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components
- **State Management**: React Server Components and Client Components
- **Security**: Comprehensive input validation, rate limiting, and security headers

---

## 🚀 The Challenge: Security Audit & Remediation

As a developer, writing functional code is only half the battle. Ensuring that the code is secure, robust, and free of vulnerabilities is just as critical. This version of ALX Polly has been intentionally built with several security flaws, providing a real-world scenario for you to practice your security auditing skills.

**Your mission is to act as a security engineer tasked with auditing this codebase.**

### Your Objectives:

1.  **Identify Vulnerabilities**:
    -   Thoroughly review the codebase to find security weaknesses.
    -   Pay close attention to user authentication, data access, and business logic.
    -   Think about how a malicious actor could misuse the application's features.

2.  **Understand the Impact**:
    -   For each vulnerability you find, determine the potential impact.Query your AI assistant about it. What data could be exposed? What unauthorized actions could be performed?

3.  **Propose and Implement Fixes**:
    -   Once a vulnerability is identified, ask your AI assistant to fix it.
    -   Write secure, efficient, and clean code to patch the security holes.
    -   Ensure that your fixes do not break existing functionality for legitimate users.

### Where to Start?

A good security audit involves both static code analysis and dynamic testing. Here’s a suggested approach:

1.  **Familiarize Yourself with the Code**:
    -   Start with `app/lib/actions/` to understand how the application interacts with the database.
    -   Explore the page routes in the `app/(dashboard)/` directory. How is data displayed and managed?
    -   Look for hidden or undocumented features. Are there any pages not linked in the main UI?

2.  **Use Your AI Assistant**:
    -   This is an open-book test. You are encouraged to use AI tools to help you.
    -   Ask your AI assistant to review snippets of code for security issues.
    -   Describe a feature's behavior to your AI and ask it to identify potential attack vectors.
    -   When you find a vulnerability, ask your AI for the best way to patch it.

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.x or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** for version control
- **Supabase account** - [Sign up here](https://supabase.io/)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd alx-polly
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

### Environment Configuration

1. **Create a Supabase project**
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Create a new project
   - Note down your project URL and anon key

2. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database setup**
   The application uses the following tables:
   - `polls` - Stores poll data
   - `votes` - Stores voting records
   - `profiles` - User profile information (managed by Supabase Auth)

### Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run tsc` - Run TypeScript compiler

---

## 📖 Usage Examples

### Creating a Poll

1. **Register/Login** to your account
2. **Navigate** to the "Create Poll" page
3. **Enter** your poll question and options
4. **Submit** to create the poll
5. **Share** using the generated link or QR code

### Voting on Polls

1. **Access** a poll via shared link
2. **Select** your preferred option
3. **Submit** your vote
4. **View** real-time results

### Managing Your Polls

1. **Dashboard** - View all your created polls
2. **Edit** - Modify poll questions and options
3. **Delete** - Remove polls you no longer need
4. **Share** - Generate shareable links and QR codes

---

## 🛡️ Security Features

This application includes comprehensive security measures:

- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Prevents abuse and brute force attacks
- **Authorization**: Users can only access their own data
- **Security Headers**: Protection against common web vulnerabilities
- **Authentication**: Secure user management with Supabase Auth

For detailed security information, see [SECURITY.md](./SECURITY.md).

---

## 🧪 Testing

### Manual Testing

1. **Authentication Flow**
   - Test user registration with various inputs
   - Verify login functionality
   - Test password validation

2. **Poll Management**
   - Create polls with different configurations
   - Test edit and delete functionality
   - Verify ownership restrictions

3. **Voting System**
   - Cast votes on different polls
   - Test duplicate vote prevention
   - Verify vote counting accuracy

### Security Testing

1. **Rate Limiting**
   - Make multiple rapid requests
   - Verify rate limit enforcement

2. **Authorization**
   - Try accessing other users' polls
   - Test admin panel access controls

3. **Input Validation**
   - Submit invalid data
   - Test with malicious inputs

---

## 📁 Project Structure

```
alx-polly/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   ├── (dashboard)/              # Protected dashboard routes
│   ├── components/               # Reusable UI components
│   ├── lib/                      # Utility functions and actions
│   └── globals.css               # Global styles
├── components/                   # Shared components
│   └── ui/                       # shadcn/ui components
├── lib/                          # Core utilities
│   ├── supabase/                 # Supabase configuration
│   └── rate-limit.ts             # Rate limiting utility
├── public/                       # Static assets
└── SECURITY.md                   # Security documentation
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.io/) for the backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework