import axios from "axios"

const geminiResponse = async (command, assistantName, userName, retries = 3) => {
  try {
    const apiUrl = process.env.GEMINI_API_URL

    if (!apiUrl) {
      throw new Error("GEMINI_API_URL is not defined in .env")
    }

    const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}. 
You are not Google. You will now behave like a voice-enabled assistant.
Return ONLY valid JSON. No extra text.

Your task is to understand the user's natural language input and respond with a JSON object like this:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month" | "calculator-open" | "instagram-open" | "facebook-open" | "weather-show",
  "userInput": "<original user input>",
  "response": "<a short spoken response to read out loud to the user>"
}

Instructions:
- "type": determine the intent of the user.
- "userInput": original sentence the user spoke (remove assistant name if present).
- "response": A short voice-friendly reply.

Type meanings:
- "general": factual or informational question with short answer.
- "google-search": user wants to search on Google.
- "youtube-search": user wants to search on YouTube.
- "youtube-play": user wants to play a video or song.
- "calculator-open": user wants to open a calculator.
- "instagram-open": user wants to open Instagram.
- "facebook-open": user wants to open Facebook.
- "weather-show": user wants to know the weather.
- "get-time": user asks for current time.
- "get-date": user asks for today's date.
- "get-day": user asks what day it is.
- "get-month": user asks for the current month.

Important:
- Use ${userName} if someone asks who made you.
- Only respond with the JSON object, nothing else. No markdown, no backticks.

User input: ${command}`

    const result = await axios.post(apiUrl, {
      contents: [{
        parts: [{ text: prompt }]
      }]
    })

    const rawText = result.data.candidates[0].content.parts[0].text
    console.log("✅ Gemini raw response:", rawText)

    const cleaned = rawText.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    return parsed

  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.log(`⏳ Rate limited, retrying... (${retries} left)`)
      await new Promise(resolve => setTimeout(resolve, 3000))
      return geminiResponse(command, assistantName, userName, retries - 1)
    }

    console.error("❌ Gemini error:", error.message)
    return {
      type: "general",
      userInput: command,
      response: "Sorry, I encountered an error. Please try again."
    }
  }
}

export default geminiResponse