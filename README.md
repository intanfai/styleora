# Styleora — Your Personal Stylist

Styleora is a personal wardrobe management and outfit planning web application designed to help users organize their clothing collection and discover outfit combinations. It combines wardrobe management, outfit inspiration, AI-powered recommendations, and weather information in a clean and elegant interface.

## Features

- **Dashboard** — View wardrobe statistics, saved outfits, and daily fashion inspiration.
- **My Wardrobe** — Organize and manage clothing items in your personal collection.
- **Outfit Generator** — Generate outfit recommendations based on your wardrobe.
- **Saved Outfits** — Save and revisit your favorite outfit combinations.
- **Weather Information** — Check local weather conditions to help plan daily outfits.
- **Responsive Interface** — A minimalist design with a cream background and sage-green accents.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Google Gemini API
- Open-Meteo API
- Browser localStorage

## Design Concept

Styleora uses an elegant, minimalist design inspired by fashion editorial websites. The interface combines a neutral cream background, sage-green accents, rounded cards, and clear typography to provide a comfortable user experience.

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/intanfai/styleora.git
   ```

2. Navigate to the project directory:

   ```bash
   cd styleora
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env.local` file in the project root and configure the required environment variables.

   For Google Gemini integration:

   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

   Keep API keys private. Never commit `.env.local` to a public repository.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```text
styleora/
├── app/
│   ├── api/
│   ├── wardrobe/
│   ├── outfits/
│   ├── saved/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── public/
├── .gitignore
├── package.json
└── README.md
```

The directory structure is a general overview and may need to be adjusted to match the actual project files.

## Environment Variables

| Variable         | Description                           |
| ---------------- | ------------------------------------- |
| `GEMINI_API_KEY` | API key for Google Gemini integration |

Weather information is retrieved through Open-Meteo. Check the API implementation for any additional configuration requirements.

## Future Improvements

- Improve outfit recommendations based on user preferences and activities.
- Enhance wardrobe organization and clothing categorization.
- Improve mobile responsiveness and accessibility.
- Enhance loading states and API error handling.
- Add user authentication and cloud-based data synchronization.

## Author

**Intan Nurul Faizia**

Frontend Developer focused on building user-friendly web applications and thoughtful UI/UX experiences.

## License

This project is developed as a personal portfolio project.
