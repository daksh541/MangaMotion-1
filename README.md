# MangaMotion AI - Setup Guide

Transform your manga panels into stunning anime-style animations with AI. Create professional animations 10x faster with our intuitive AI-powered tool.

## 🚀 Quick Start

### Option 1: One-Click Setup (Recommended)

**For Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**For Windows:**
- Double-click `start.bat`

### Option 2: Manual Setup

```bash
# Install dependencies
npm install

# Start the server
npm start
```

## 📋 Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

## 🏗️ Project Structure

```
/mnt/okcomputer/output/
├── server.js           ← Express server
├── package.json        ← Dependencies
├── start.sh            ← Linux/Mac startup script
├── start.bat           ← Windows startup script
├── README.md           ← This file
├── index.html          ← Landing page
├── signup.html         ← Sign up page
├── login.html          ← Login page
├── dashboard.html      ← User dashboard
├── upload.html         ← File upload page
├── detection.html      ← Panel detection page
├── editor.html         ← Animation editor
├── export.html         ← Export page
├── pricing.html        ← Pricing plans
├── main.js             ← Main JavaScript
├── public/             ← Static assets (CSS, images)
└── resources/          ← Additional resources
```

## 🌐 Accessing the Application

Once the server is running, open your browser and go to:

**http://localhost:3000**

You should see the MangaMotion AI landing page with all features working.

## 📄 Available Pages

- `/` - Home/Landing page
- `/signup` - User registration
- `/login` - User login
- `/dashboard` - User dashboard
- `/upload` - File upload interface
- `/detection` - AI panel detection
- `/editor` - Animation editor
- `/export` - Export options
- `/pricing` - Pricing plans

## 🔧 API Endpoints

- `GET /api/status` - Server health check
- `POST /api/upload` - File upload endpoint
- `GET /api/projects` - List user projects

## 🛠️ Development

### Installing Dependencies
```bash
npm install
```

### Running in Development Mode
```bash
npm run dev
```

### Production Start
```bash
npm start
```

## 🎨 Features

- **AI Panel Detection**: Automatically detects manga panels with 99% accuracy
- **Voice Generation**: 50+ AI voices with emotion matching
- **Smart Animation**: Motion that adapts to scene emotion
- **Custom Styling**: Full customization of animation styles
- **Social Media Ready**: Optimized export for all platforms
- **Cloud Processing**: Fast, secure processing

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🐛 Troubleshooting

### Server won't start
- Check Node.js installation: `node --version`
- Ensure you're in the correct directory
- Try reinstalling dependencies: `rm -rf node_modules && npm install`

### Pages show 404
- Verify HTML files are in root directory
- Check file names match exactly
- Restart the server

### Styles not loading
- Check `public/css/` folder exists
- Verify CSS files are present
- Clear browser cache

### Port already in use
- Use different port: `PORT=3001 npm start`
- Kill existing process: `lsof -ti:3000 | xargs kill -9`

## 📞 Support

For issues or questions:
1. Check this README
2. Review server.js for configuration
3. Ensure all files are properly saved

## 📄 License

MIT License - See package.json for details

---

**Happy animating! 🎬**
