# EaseMail - The Future

Enterprise-grade email client with AI-powered features, built with Next.js 14, Supabase, Drizzle ORM, Nylas, and Aurinko.

## 🚀 Features

- **Unified Inbox**: Manage multiple email accounts in one place
- **AI-Powered**: Smart email summaries, compose assistance, and intelligent categorization
- **Contact Management**: Advanced CRM features with activity tracking
- **3-Column Layout**: Efficient email workflow with folders, email list, and contact panel
- **Real-time Sync**: Automatic email synchronization via webhooks
- **Enterprise Ready**: Built for teams with advanced security and collaboration features

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (Auth & Database)
- **Database**: PostgreSQL with Drizzle ORM
- **Email Providers**: Nylas (primary), Aurinko (fallback)
- **AI**: OpenAI GPT-4 / Claude API
- **Deployment**: Vercel
- **Version Control**: GitHub

## 📦 Installation

### Prerequisites

- Node.js 20+ and npm
- Supabase account (free tier available)
- Nylas developer account
- Aurinko developer account (optional, for fallback)
- OpenAI API key (for AI features)

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/easemail-the-future.git
cd easemail-the-future
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Nylas (Primary Email Provider)
NYLAS_API_KEY=your_nylas_api_key
NYLAS_API_URI=https://api.us.nylas.com
NYLAS_CLIENT_ID=your_nylas_client_id
NYLAS_CLIENT_SECRET=your_nylas_client_secret

# Aurinko (Fallback Email Provider)
AURINKO_API_URL=https://api.aurinko.io
AURINKO_CLIENT_ID=your_aurinko_client_id
AURINKO_CLIENT_SECRET=your_aurinko_client_secret

# OpenAI for AI features
OPENAI_API_KEY=your_openai_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Encryption
EMAIL_ENCRYPTION_KEY=your_32_character_encryption_key_here

# Webhook secret
WEBHOOK_SECRET=your_webhook_secret_key
```

4. **Setup Supabase Database**

Go to your Supabase project and run the SQL for creating tables (or use Drizzle migrations):

```bash
npm run db:generate
npm run db:push
```

5. **Enable Supabase Auth Providers**

In your Supabase dashboard:
- Go to Authentication > Providers
- Enable Email authentication
- Enable Google OAuth (optional)

6. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🗂️ Project Structure

```
EaseMail-The-Future/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── inbox/
│   │   ├── contacts/
│   │   └── settings/
│   ├── api/                 # API routes
│   │   ├── emails/
│   │   ├── contacts/
│   │   ├── ai/
│   │   └── webhooks/
│   ├── layout.tsx
│   ├── page.tsx            # Landing page
│   └── globals.css
├── components/
│   ├── email/              # Email client components
│   │   ├── EmailClient.tsx
│   │   ├── EmailList.tsx
│   │   ├── EmailViewer.tsx
│   │   └── ContactPanel.tsx
│   ├── layout/             # Layout components
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── db/                 # Database & Drizzle
│   ├── email/              # Email integrations
│   │   ├── nylas-client.ts
│   │   └── aurinko-client.ts
│   └── utils.ts
├── design/                  # Original HTML design files
├── drizzle/                 # Database migrations
├── middleware.ts            # Auth middleware
└── package.json
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server

# Production
npm run build           # Build for production
npm start               # Start production server

# Database
npm run db:generate     # Generate migrations
npm run db:push         # Push schema to database
npm run db:studio       # Open Drizzle Studio

# Linting
npm run lint            # Run ESLint
```

## 📱 Features Roadmap

### ✅ Completed
- [x] Next.js 14 project setup
- [x] Supabase authentication
- [x] Drizzle ORM schema
- [x] Nylas & Aurinko integration modules
- [x] 3-column email client layout
- [x] Email list with expandable cards
- [x] Contact panel with AI chat
- [x] Login/Signup pages
- [x] Responsive design

### 🚧 In Progress
- [ ] Real email sync with Nylas/Aurinko
- [ ] Webhook handlers for real-time updates
- [ ] Email composer with rich text
- [ ] Settings pages (accounts, signatures, preferences)
- [ ] Contacts management page
- [ ] AI email summaries
- [ ] Marketing site conversion

### 📋 Planned
- [ ] Email search & filters
- [ ] Email templates
- [ ] Calendar integration
- [ ] Team collaboration features
- [ ] Mobile app (React Native)
- [ ] Email tracking & analytics
- [ ] Advanced automation rules

## 🔐 Security

- All email credentials are encrypted before storage
- Row Level Security (RLS) enabled on Supabase
- HTTPS enforced in production
- OAuth 2.0 for email provider authentication
- Webhook signature verification

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Environment Variables

Make sure to add all environment variables from `.env.example` in your Vercel project settings.

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For support, email support@easemail.com or join our Discord community.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- Nylas and Aurinko for email API services
- Vercel for hosting and deployment
- OpenAI for AI capabilities

---

Built with ❤️ by the EaseMail Team


