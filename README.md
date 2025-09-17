# Code Quality Insight - Frontend

A modern React-based frontend application for analyzing code quality and providing insights through AI-powered analysis.

## Features

- 🔍 **Code Analysis**: Upload files or connect GitHub repositories for comprehensive code quality analysis
- 💬 **AI Chat Interface**: Interactive chat with AI agents for code insights and recommendations
- 📊 **Visual Analytics**: Charts and dashboards displaying code quality metrics
- 🔗 **GitHub Integration**: Direct repository analysis via GitHub URL
- 📁 **File Explorer**: Browse and analyze uploaded code files
- 🎯 **Multiple Analysis Types**: Security, performance, best practices, and more

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Backend API** running on `http://localhost:8000` (see API configuration below)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/harismanazir/cqi-fe
cd frontend-cqi
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Backend Setup

Clone and set up the backend server:

```bash
git clone https://github.com/harismanazir/cqi-be
cd cqi-be
```

Follow the setup instructions in the backend repository's README to install dependencies and start the server.

### 4. Configure Backend API

After hosting your backend server, update the API configuration in `src/lib/api.ts` with your hosted server URL:

```typescript
const API_BASE_URL = 'your-hosted-server-url'; // Replace with your backend server URL
```

### 5. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
# or
yarn build
```

### 7. Preview Production Build

```bash
npm run preview
# or
yarn preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── FileUpload.tsx  # File upload functionality
│   ├── GitHubUpload.tsx # GitHub integration
│   └── AnalysisCharts.tsx # Data visualization
├── pages/              # Main application pages
│   ├── Landing.tsx     # Landing page
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Chat.tsx        # AI chat interface
│   └── Index.tsx       # Home page
├── lib/                # Utilities and API client
│   └── api.ts          # Backend API integration
└── hooks/              # Custom React hooks
```

## Technologies Used

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Lucide React** - Icon library
- **Recharts** - Data visualization

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## API Integration

The frontend communicates with a backend API for:

- File upload and processing
- GitHub repository analysis
- AI-powered chat interactions
- Code quality metrics generation

Make sure your backend API is running and accessible at the configured URL.

## Development

### Adding New Components

When creating new components, follow the existing patterns:
- Use TypeScript interfaces for props
- Follow the shadcn/ui component structure
- Add appropriate error handling
- Include proper accessibility attributes

### State Management

The application uses React's built-in state management with:
- useState for component state
- useContext for shared state
- React Query for server state

### Styling

- Use Tailwind CSS utility classes
- Follow the design system established by shadcn/ui
- Maintain consistent spacing and typography
