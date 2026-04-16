import axios from 'axios'
import React, { createContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const userDataContext = createContext()

function UserContext({ children }) {
  const serverUrl = "http://localhost:8000"
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [frontendImage, setFrontendImage] = useState(null)
  const [backendImage, setBackendImage] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  const navigate = useNavigate()

  const handleCurrentUser = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/user/current`, { withCredentials: true })
      setUserData(result.data)
    } catch (error) {
      console.log(error)
      navigate("/signin")
    } finally {
      setLoading(false)
    }
  }

  const getGeminiResponse = async (command) => {
  try {
    const result = await axios.post(
      `${serverUrl}/api/user/asktoassistant`,
      { command: command }, // ✅ SAME NAME USE KAR
      { withCredentials: true }
    );

    return result.data;

  } catch (error) {
    console.error(" API ERROR:", error.response?.data || error.message);
    return null;
  }
};

  useEffect(() => {
    handleCurrentUser()
  }, [])

  const value = {
    serverUrl,
    userData,
    setUserData,
    loading,
    backendImage, setBackendImage,
    frontendImage, setFrontendImage,
    selectedImage, setSelectedImage,
    getGeminiResponse
  }

  if (loading) return <div className='w-full h-screen flex justify-center items-center bg-black text-white text-xl'>Loading...</div>

  return (
    <userDataContext.Provider value={value}>
      {children}
    </userDataContext.Provider>
  )
}

export default UserContext