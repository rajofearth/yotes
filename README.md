# Yotes

Yotes is a privacy-first web application designed to empower users with full control over their data. More than just a notes app, Yotes integrates with your Google Drive to securely store and manage notes, documents (PDFs, Docs, Excel, PPTs), and other resources—all without subscription fees, as it leverages your own Google Drive storage. Built with a sleek, dark-themed interface using React and Tailwind CSS, Yotes aims to centralize your resources in one intuitive hub. Check out the live site at [yotes.vercel.app](https://yotes.vercel.app).

## Vision

Yotes prioritizes user privacy by ensuring all data stays within your Google Drive, avoiding third-party storage costs or lock-in. Beyond note-taking, it aspires to be a versatile platform where you can import, view, and organize various file types, embedding rich media like YouTube videos or website previews, and enhancing productivity with AI-powered features—all while remaining lightweight and user-controlled.

## Features

- **Privacy-Focused Notes**: Create, edit, and delete notes stored securely in your Google Drive.
- **Google Drive Integration**: Uses your Drive’s "Yotes App" folder for notes and tags, with plans to support file imports (PDFs, Docs, etc.).
- **Tagging System**: Categorize notes with customizable tags synced to Drive.
- **Search & Filter**: Quickly find notes by content or tags.
- **Activity Heatmap**: Visualize note creation over the past year in the Settings page.
- **Responsive Design**: Works seamlessly on desktop and mobile.
- **Google OAuth**: Secure sign-in via Supabase authentication.
- **Dark Theme**: Default dark mode with JetBrains Mono font for a developer-friendly experience.
- **Toast Notifications**: Real-time feedback for actions like saving or errors.

## Planned Features (TODO)

From Yashraj’s rough TODO list, here’s what’s in the pipeline:
- [x] Enhanced edit page UI/UX.
- [x] Improved loading indicators with timestamps on note cards.
- [x] Tag creation fix for mobile devices.
- [ ] Static pages: Homepage, Privacy Policy, and Terms & Conditions.
- [ ] Caching for account details and offline access.
- [ ] Export/import functionality.
- [ ] Progressive Web App (PWA) support.
- [ ] PDF viewer and download capabilities.
- [ ] Rich previews for links (e.g., website showcases, YouTube embeds).
- [ ] AI-powered description generator and search summaries.
- [ ] Markdown support for notes.
- [ ] Dedicated support for dropping files (images, videos, links) with specialized views.

## Tech Stack

- **Frontend**: React, React Router, Vite
- **Styling**: Tailwind CSS, shadcn/ui, Lucide icons
- **Integration**: Google Drive API, Supabase Auth
- **State Management**: React Contexts (GoogleDriveContext, ToastContext, ThemeContext)
- **Build Tools**: Vite, ESLint, PostCSS
- **Dependencies**: See `package.json`

## Prerequisites

- Node.js (v18+ recommended)
- Google account for OAuth and Drive access
- Supabase project with Google OAuth configured
- `.env` file with Supabase credentials

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/rajofearth/yotes.git
   cd yotes
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   - Get these from your Supabase project dashboard.

4. **Run Locally**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` in your browser.

## Usage

1. **Sign In**: Log in with Google to connect your Drive.
2. **Create Notes**: Use the "+" button in the navbar to add notes.
3. **Organize**: Add tags or (soon) import files like PDFs.
4. **Search & Filter**: Use the search bar or tag filters on the homepage.
5. **Track Activity**: Check your note heatmap in Settings.
6. **Manage Account**: Log out or delete your account from Settings.

## Project Structure

```
yotes/
├── src/
│   ├── components/        # UI components (e.g., NavBar, NoteCard)
│   ├── contexts/         # Contexts for state (e.g., GoogleDriveContext)
│   ├── data/            # Sample data (notes.json, tags.json)
│   ├── hooks/          # Custom hooks (e.g., useNotes)
│   ├── lib/           # Utilities (e.g., className helpers)
│   ├── pages/         # Page components (e.g., Home, Settings)
│   ├── styles/        # Custom CSS (e.g., heatmap.css)
│   ├── utils/         # Helpers (e.g., googleDrive.js)
│   ├── App.jsx         # Router setup
│   ├── index.css       # Global styles with Tailwind
│   └── main.jsx        # Entry point
├── .gitignore          # Ignored files
├── package.json        # Dependencies
├── tailwind.config.js  # Tailwind config
├── vite.config.js      # Vite config
└── README.md           # This file
```

## Development

- **Lint**: `npm run lint` for ESLint checks.
- **Build**: `npm run build` for production assets in `dist/`.
- **Preview**: `npm run preview` to test the build locally.

## Deployment

Configured for Vercel with SPA routing via `vercel.json`. Add `.env` variables to Vercel’s settings. The live site is available at [yotes.vercel.app](https://yotes.vercel.app).

## Contributing

Contributions are welcome! To contribute:
1. Fork the repo: `https://github.com/rajofearth/yotes`.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m "Add your feature"`.
4. Push: `git push origin feature/your-feature`.
5. Submit a pull request.

## License

Currently unlicensed; a license will be added as the project evolves.

## Acknowledgments

- Created by Yashraj Maher (GitHub: [rajofearth](https://github.com/rajofearth)).
- Thanks to the React, Tailwind, Supabase, and Google Drive communities.

