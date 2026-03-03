/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#39CB69",
                primaryHover: "#2FB75C",
                background: "#015351",
                surface: "#0A6462",
                surfaceHover: "#0D706D",
                text: "#F6F7F6",
                textMuted: "#C8D8D6",
                border: "#1B7C79"
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                display: ['Cinzel', 'serif'],
            }
        },
    },
    plugins: [],
}
