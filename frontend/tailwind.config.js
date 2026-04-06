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
                primaryHover: "#22C55E",
                background: "#F6F7F6",
                surface: "#FFFFFF",
                surfaceHover: "#F3F4F6",
                text: "#060606",
                textMuted: "#4B6867",
                border: "#E5E7EB",
                brandDark: "#015351"
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
                display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
