'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const GameProgressContext = createContext()

export function useGameProgress() {
    const context = useContext(GameProgressContext)
    if (!context) {
        throw new Error('useGameProgress must be used within a GameProgressProvider')
    }
    return context
}

const setStoredGameProgress = (value) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem('gameProgress', JSON.stringify(value))
            return true
        }
    } catch (error) {
        console.error('Failed to save game progress to localStorage:', error)
        return false
    }
    return false
}

const getStoredGameProgress = () => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('gameProgress')
            if (stored) {
                const parsed = JSON.parse(stored)
                return parsed
            }
        }
    } catch (error) {
        console.error('Error getting stored game progress:', error)
    }
    return null
}

const clearStoredGameProgress = () => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('gameProgress')
        }
    } catch (error) {
        console.error('Failed to clear stored game progress:', error)
    }
}

const getDefaultGameProgress = () => ({
    defeatedEnemies: 0,
    maxDefeatedEnemies: 2,
    currentBossNumber: 0,
    maxBossNumber: 4,
    playedStory: false
})

export function GameProgressProvider({ children }) {
    const [gameProgress, setGameProgress] = useState(getDefaultGameProgress())
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && !isInitialized) {
            const savedProgress = getStoredGameProgress()
            if (savedProgress) {
                setGameProgress(savedProgress)
            }
            setIsInitialized(true)
        }
    }, [isInitialized])

    const incrementDefeatedEnemies = (count = 1) => {
        const updatedProgress = {
            ...gameProgress,
            defeatedEnemies: gameProgress.defeatedEnemies + count
        }
        setGameProgress(updatedProgress)
        setStoredGameProgress(updatedProgress)
        return updatedProgress
    }

    const incrementCurrentBossNumber = (count = 1) => {
        const currentBossNumber = gameProgress.currentBossNumber || 0
        const newBossNumber = Math.min(currentBossNumber + count, gameProgress.maxBossNumber)

        const updatedProgress = {
            ...gameProgress,
            defeatedEnemies: 0,
            currentBossNumber: newBossNumber
        }
        setGameProgress(updatedProgress)
        setStoredGameProgress(updatedProgress)
        return updatedProgress
    }

    const setCurrentBossNumber = (bossNumber) => {
        if (bossNumber < 0 || bossNumber > gameProgress.maxBossNumber) {
            console.error(`Invalid boss number: ${bossNumber}. Must be between 0 and ${gameProgress.currentBossNumber || 0}`)
            return false
        }

        const updatedProgress = {
            ...gameProgress,
            currentBossNumber: bossNumber
        }
        setGameProgress(updatedProgress)
        setStoredGameProgress(updatedProgress)
        return true
    }

    const setPlayedStory = () => {
        const updatedProgress = {
            ...gameProgress,
            playedStory: true
        }
        setGameProgress(updatedProgress)
        setStoredGameProgress(updatedProgress)
        return updatedProgress
    }

    const resetGameProgress = () => {
        const defaultProgress = getDefaultGameProgress()
        setGameProgress(defaultProgress)
        setStoredGameProgress(defaultProgress)
    }

    const clearSavedGameProgress = () => {
        clearStoredGameProgress()
        setGameProgress(getDefaultGameProgress())
        setIsInitialized(false)
    }

    const value = {
        gameProgress,
        isLoading,
        error,
        isInitialized,
        incrementDefeatedEnemies,
        incrementCurrentBossNumber,
        setCurrentBossNumber,
        setPlayedStory,
        resetGameProgress,
        clearSavedGameProgress
    }

    return (
        <GameProgressContext.Provider value={value}>
            {children}
        </GameProgressContext.Provider>
    )
}
