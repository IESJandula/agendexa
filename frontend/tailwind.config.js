/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#E5C07B", /* Rich Gold */
                primaryHover: "#FCEFD4",
                background: "#050505",
                surface: "#0a0a0a",
                surfaceHover: "#121212",
                text: "#F3F3F3",
                textMuted: "#8E8E8E",
                border: "#1F1F1F"
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                display: ['Cinzel', 'serif'],
            }
        },
    },
    plugins: [],
}
