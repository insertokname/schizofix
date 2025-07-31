'use client'

import Image from "next/image";
import { useGameProgress } from "./providers/GameProgressProvider";

export default function Home() {
  const { gameProgress } = useGameProgress();
  return (
    <div 
      className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20"
      style={{
        backgroundImage: 'url(/full_repeating.png)',
        backgroundSize: '100px 100px',
        backgroundRepeat: 'repeat'
      }}
    >
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <div 
          className="relative"
          style={{
            background: 'radial-gradient(circle, white 10%, transparent 90%)',
            borderRadius: '70%',
            padding: '60px'
          }}
        >
          <Image
            src="/schizo_fix.png"
            alt="schizo fix logo"
            width={540}
            height={112}
            priority
            className="w-[600px] sm:w-[400px] md:w-[540px] h-auto"
          />
        </div>

        <div className="flex flex-col gap-4 items-center">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-black text-white gap-2 hover:bg-gray-800 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/story"
          >
            Start
          </a>
          
          {gameProgress.playedStory && (
            <div className="flex gap-4 items-center flex-row">
              <a
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-black text-white gap-2 hover:bg-gray-800 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                href="/ar"
              >
                AR Demo
              </a>
              <a
                className="rounded-full border border-solid border-black transition-colors flex items-center justify-center bg-white text-black gap-2 hover:bg-gray-100 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                href="/map"
              >
                Map
              </a>
            </div>
          )}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}
