import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Lucid — auditor textual determinístico",
  description:
    "Auditoria textual determinística: cada apontamento rastreável ao critério e à fonte que o fundamenta — cláusulas da ABNT NBR ISO 24495-1:2024, convenções editoriais e heurísticas estruturais declaradas. Mede, não aprova.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              `try{var t=localStorage.getItem('lucid-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}` +
              `try{var l=localStorage.getItem('lucid-lang');if(l==='en'||l==='pt-BR'){var d=document.documentElement;d.setAttribute('data-lang',l);d.setAttribute('lang',l);}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
