'use client'

import { useRouter } from 'next/navigation'
import { useGameProgress } from '../providers/GameProgressProvider'

export default function Story() {
  const { setPlayedStory } = useGameProgress()
  const router = useRouter()

  const handleContinue = () => {
    setPlayedStory()
    router.push('/map')
  }

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
          className="relative text-center"
          style={{
            background: 'radial-gradient(circle, white 20%, transparent 100%)',
            borderRadius: '40%',
            padding: '50px'
          }}
        >
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-black mb-8">
            You just escaped the psychiatric ward and are searching for answers. Defeat all the voices in order to percept reality as it is.
          </h1>
        </div>

        <div className="flex gap-4 items-center flex-row">
          <button
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-black text-white gap-2 hover:bg-gray-800 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}
