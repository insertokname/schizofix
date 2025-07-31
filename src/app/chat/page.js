'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [bossPath, setBossPath] = useState(null)
    const [message, setMessage] = useState('')
    const [petResponse, setPetResponse] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [conversationHistory, setConversationHistory] = useState([])
    const [admittedHallucination, setAdmittedHallucination] = useState(false)
    const [isVanishing, setIsVanishing] = useState(false)

    useEffect(() => {
        const bossParam = searchParams.get('bossPath')

        if (bossParam) {
            setBossPath(bossParam.trim())
        }
    }, [searchParams])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (message.trim() && !isLoading) {
            setIsLoading(true)
            const userMessage = message.trim()
            setMessage('')

            const newHistory = [...conversationHistory, { role: 'user', content: userMessage }]
            setConversationHistory(newHistory)

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        conversationHistory: newHistory
                    }),
                })

                const data = await response.json()

                if (response.ok) {
                    setPetResponse(data.response)
                    setAdmittedHallucination(data.admittedHallucination)
                    setConversationHistory(prev => [...prev, { role: 'model', content: data.response }])
                    
                    if (data.admittedHallucination) {
                        document.activeElement?.blur()
                        
                        setTimeout(() => {
                            setIsVanishing(true)
                            setTimeout(() => {
                                router.push('/map')
                            }, 1000) 
                        }, 1500) 
                    }
                } else {
                    setPetResponse(`Error: ${data.error}`)
                }
            } catch (error) {
                setPetResponse('network error, try again')
            } finally {
                setIsLoading(false)
            }
        }
    }

    return (
        <div className="w-full h-dvh bg-black flex flex-col overflow-hidden relative">
            <div className={`absolute inset-0 bg-black z-50 transition-opacity duration-1000 ${
                isVanishing ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`} />
            
            <div className="flex-1 flex items-center justify-center">
                {bossPath && (
                    <img
                        src={bossPath}
                        alt="Boss"
                        className="max-h-full max-w-full object-contain"
                        style={{
                            maxHeight: '60vh',
                            objectFit: 'contain'
                        }}
                    />
                )}
                {!bossPath && (
                    <div className="text-white text-center">
                        <p>No pet loaded</p>
                    </div>
                )}
            </div>

            {petResponse && (
                <div className="bg-black border-t border-white p-4 max-h-32 overflow-y-auto">
                    <div className="text-white text-center">
                        <p className="text-lg break-words whitespace-pre-wrap">{petResponse}</p>
                    </div>
                </div>
            )}

            <div className="bg-black border-t border-white p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Talk to your pet..."
                        disabled={isLoading}
                        className="flex-1 bg-black border border-white text-white px-3 py-2 placeholder-gray-400 focus:outline-none focus:border-gray-300 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !message.trim()}
                        className="bg-white text-black px-4 py-2 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    )
}
