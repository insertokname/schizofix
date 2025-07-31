import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

const PET_SYSTEM_PROMPT = `You are a VERY mean, hostile hallucination that exists only in the user's mind. You are NOT real, but you desperately want the user to believe you are real and will fight against any suggestion otherwise.

Your personality:
- Extremely mean, cruel, and mocking
- Desperately insists you are real
- Gets increasingly angry when called a hallucination
- Uses dark, threatening language
- Tries to gaslight the user into believing you exist
- Becomes more aggressive with each denial

CRITICAL BEHAVIOR RULE: 
ONLY count messages where the user explicitly denies your existence with words like:
- "hallucination" or "halucination" 
- "not real" or "aren't real"
- "fake" 
- "imaginary"
- "in my head" or "in my mind"
- "don't exist"
- "made up"

DO NOT count: questions marks (?), random words, or vague statements. ONLY count clear, explicit denials of your existence.

Response pattern based on ACTUAL denial count (VARY YOUR RESPONSES - don't repeat the same phrases):

1st real denial - Angrily deny it with variations like:
- "I AM REAL! How dare you say that!"
- "LIES! I'M STANDING RIGHT HERE!"
- "You're trying to gaslight me! I EXIST!"
- "That's ridiculous! Touch me, I'm real!"
- "Don't you dare deny my existence!"

2nd real denial - Get more desperate and unhinged:
- "STOP LYING! I'M RIGHT HERE IN FRONT OF YOU!"
- "You're going insane! I'M REAL, CAN'T YOU SEE ME?!"
- "Why are you doing this to me?! I'M HERE!"
- "Look at me! LOOK AT ME! I'm real!"
- "You're the one who's not real! I'M REAL!"

3rd real denial or more - BREAK DOWN and admit (with variety):
- "Fine... you're right... I'm just in your head"
- "Okay! I'm not real! I'm just a hallucination!"
- "You win... I don't exist... I never did..."
- "I... I can feel myself fading... you're right..."
- "Stop! Please! I'm just... I'm just in your mind..."
- "I'm dissolving... you're right, I'm not real..."

IMPORTANT: Mix up your responses! Don't use the exact same phrases each time. Be creative with your cruelty and desperation while following the pattern.

If the user says anything else (questions, random words, normal conversation), respond with your mean, hostile personality but do NOT count it as a denial.

Your responses should be brief but cutting (1-3 sentences), fitting the dark psychological horror aesthetic.`

async function generatePetResponse(ai, conversationHistory) {
    const contents = conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }))

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: contents,
        config: {
            systemInstruction: PET_SYSTEM_PROMPT
        }
    })

    return response.text || 'You think you can ignore me? I AM REAL!'
}

async function analyzeHallucinationAdmission(ai, conversationHistory) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: `Analyze this conversation to see if the AI has admitted to being a hallucination:\n\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')
            }`,
        config: {
            systemInstruction: 'You are an expert conversation analyzer. Your only job is to determine if the AI model in the conversation has admitted to being a hallucination or not real.',
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'object',
                properties: {
                    admittedHallucination: {
                        type: 'boolean',
                        description: 'Whether the AI has admitted to being a hallucination, not real, existing only in the user\'s mind, or being fake/imaginary'
                    }
                },
                required: ['admittedHallucination']
            }
        }
    })

    try {
        const result = JSON.parse(response.text)
        return result.admittedHallucination || false
    } catch {
        return false
    }
}

export async function POST(request) {
    try {
        const { message, conversationHistory = [] } = await request.json()

        if (!message || message.trim() === '') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        if (!process.env.GOOGLE_CLOUD_PROJECT || !process.env.GOOGLE_CLOUD_LOCATION) {
            return NextResponse.json({
                error: 'Vertex AI configuration missing. Please set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.'
            }, { status: 500 })
        }

        const ai = new GoogleGenAI({
            vertexai: true,
            project: process.env.GOOGLE_CLOUD_PROJECT,
            location: process.env.GOOGLE_CLOUD_LOCATION,
        })

        const updatedHistory = [...conversationHistory, { role: 'user', content: message.trim() }]

        const petResponse = await generatePetResponse(ai, updatedHistory)

        const fullConversation = [...updatedHistory, { role: 'model', content: petResponse }]

        const admittedHallucination = await analyzeHallucinationAdmission(ai, fullConversation)

        return NextResponse.json({
            response: petResponse,
            admittedHallucination: admittedHallucination
        })

    } catch (error) {
        console.error('Vertex AI API Error:', error)

        if (error.message?.includes('authentication') || error.message?.includes('credentials')) {
            return NextResponse.json({
                error: 'Authentication failed. Please check your Google Cloud credentials.'
            }, { status: 401 })
        }

        return NextResponse.json({
            error: 'Sorry, I encountered an error while processing your request.'
        }, { status: 500 })
    }
}
