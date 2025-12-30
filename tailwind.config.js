/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                finance: {
                    green: '#00C805', // Bloomberg Green
                    red: '#FF333A',   // Bloomberg Red
                    bg: '#121212',    // Dark Background
                    card: '#1E1E1E',  // Card Background
                    text: '#E0E0E0',  // Primary Text
                    muted: '#888888', // Muted Text
                    blue: '#2F80ED',  // Action Blue
                }
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
