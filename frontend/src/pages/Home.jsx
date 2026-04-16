import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg"
import { RxCross1 } from "react-icons/rx"
import userImg from "../assets/user.gif"

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext)
  const navigate = useNavigate()
  const [listening, setListening] = useState(false)
  const [userText, setUserText] = useState("")
  const [aiText, setAiText] = useState("")
  const [ham, setHam] = useState(false)

  const isSpeakingRef = useRef(false)
  const isRecognizingRef = useRef(false)
  const recognitionRef = useRef(null)
  const userDataRef = useRef(userData)
  const synth = window.speechSynthesis

  useEffect(() => {
    userDataRef.current = userData
  }, [userData])

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true })
      setUserData(null)
      navigate("/signin")
    } catch (error) {
      setUserData(null)
      console.log(error)
      navigate("/signin")
    }
  }

  const startRecognition = () => {
    if (!isSpeakingRef.current && !isRecognizingRef.current) {
      try {
        recognitionRef.current?.start()
        console.log("Recognition requested to start")
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.error("Start error:", error)
        }
      }
    }
  }

  const openUrl = (url) => {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const openCommand = (data) => {
    if (!data) return
    const { type, userInput } = data

    if (type === 'google-search') {
      openUrl(`https://www.google.com/search?q=${encodeURIComponent(userInput)}`)
    }
    if (type === 'calculator-open') {
      openUrl(`https://www.google.com/search?q=calculator`)
    }
    if (type === 'instagram-open') {
      openUrl(`https://www.instagram.com/`)
    }
    if (type === 'facebook-open') {
      openUrl(`https://www.facebook.com/`)
    }
    if (type === 'weather-show') {
      openUrl(`https://www.google.com/search?q=weather`)
    }
    if (type === 'youtube-search' || type === 'youtube-play') {
      openUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(userInput)}`)
    }
  }

  const speak = (text) => {
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'hi-IN'

    const voices = synth.getVoices()
    const hindiVoice = voices.find(v => v.lang === 'hi-IN')
    if (hindiVoice) utterance.voice = hindiVoice

    isSpeakingRef.current = true

    utterance.onend = () => {
      setAiText("")
      isSpeakingRef.current = false
      setTimeout(() => startRecognition(), 800)
    }

    synth.speak(utterance)
  }

  const getLocalResponse = (type) => {
    const now = new Date()
    if (type === 'get-time') return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    if (type === 'get-date') return now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    if (type === 'get-day') return now.toLocaleDateString('en-IN', { weekday: 'long' })
    if (type === 'get-month') return now.toLocaleDateString('en-IN', { month: 'long' })
    return null
  }

  useEffect(() => {
    if (!userData) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognitionRef.current = recognition

    let isMounted = true

    const speakGreeting = () => {
      const greeting = new SpeechSynthesisUtterance(
        `Hello ${userData.name}, what can I help you with?`
      )
      greeting.lang = 'hi-IN'
      const voices = synth.getVoices()
      const hindiVoice = voices.find(v => v.lang === 'hi-IN')
      if (hindiVoice) greeting.voice = hindiVoice

      isSpeakingRef.current = true

      greeting.onend = () => {
        isSpeakingRef.current = false
        setTimeout(() => {
          if (isMounted) startRecognition()
        }, 800)
      }

      synth.cancel()
      synth.speak(greeting)
    }

    if (synth.getVoices().length > 0) {
      speakGreeting()
    } else {
      synth.onvoiceschanged = speakGreeting
    }

    recognition.onstart = () => {
      isRecognizingRef.current = true
      setListening(true)
    }

    recognition.onend = () => {
      isRecognizingRef.current = false
      setListening(false)
      if (isMounted) {
        setTimeout(() => {
          if (isMounted && !isSpeakingRef.current) {
            try {
              recognition.start()
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e)
            }
          }
        }, 1000)
      }
    }

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error)
      isRecognizingRef.current = false
      setListening(false)

      const fatalErrors = ["not-allowed", "service-not-allowed", "audio-capture"]
      if (event.error !== "aborted" && !fatalErrors.includes(event.error) && isMounted) {
        setTimeout(() => {
          if (isMounted && !isSpeakingRef.current) {
            try {
              recognition.start()
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e)
            }
          }
        }, 1000)
      }
    }

    // ✅ FIXED: Wake word optional - any meaningful speech will be processed
    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim()
      console.log("Transcript:", transcript)

      const currentUser = userDataRef.current
      if (!currentUser?.assistantName) return

      const hasWakeWord = transcript.toLowerCase().includes(currentUser.assistantName.toLowerCase())
      const isDirectCommand = transcript.trim().length > 3

      if (hasWakeWord || isDirectCommand) {
        setAiText("")
        setUserText(transcript)
        recognition.stop()
        isRecognizingRef.current = false
        setListening(false)

        const data = await getGeminiResponse(transcript)
        if (!data) {
          console.error("No response from getGeminiResponse")
          setTimeout(() => startRecognition(), 1000)
          return
        }

        console.log("✅ Parsed command data:", data)

        const localAnswer = getLocalResponse(data.type)
        const finalResponse = localAnswer ? `${data.response} ${localAnswer}` : data.response

        setAiText(finalResponse)
        setUserText("")

        openCommand(data)
        speak(finalResponse)
      }
    }

    return () => {
      isMounted = false
      recognition.stop()
      synth.cancel()
      setListening(false)
      isRecognizingRef.current = false
      isSpeakingRef.current = false
    }
  }, [])

  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>

      <CgMenuRight
        className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]'
        onClick={() => setHam(true)}
      />

      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham ? "translate-x-0" : "translate-x-full"} transition-transform`}>
        <RxCross1
          className='text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]'
          onClick={() => setHam(false)}
        />
        <button
          className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]'
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px] py-[10px]'
          onClick={() => navigate("/customize")}
        >
          Customize your Assistant
        </button>
        <div className='w-full h-[2px] bg-gray-400'></div>
        <h1 className='text-white font-semibold text-[19px]'>History</h1>
        <div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>
          {userData.history?.map((his, index) => (
            <div key={index} className='text-gray-200 text-[18px] w-full h-[30px]'>{his}</div>
          ))}
        </div>
      </div>

      <button
        className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[19px]'
        onClick={handleLogOut}
      >
        Log Out
      </button>
      <button
        className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block'
        onClick={() => navigate("/customize")}
      >
        Customize your Assistant
      </button>

      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
        <img src={userData?.assistantImage} alt="assistant" className='h-full object-cover' />
      </div>

      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>

      {listening && !aiText && (
        <p className='text-green-400 text-sm animate-pulse'>Listening...</p>
      )}

      {!aiText && <img src={userImg} alt="user" className='w-[200px]' />}
      {aiText && <img src={aiImg} alt="ai" className='w-[200px]' />}

      <h1 className='text-white text-[18px] font-semibold text-wrap'>
        {userText ? userText : aiText ? aiText : null}
      </h1>

    </div>
  )
}

export default Home