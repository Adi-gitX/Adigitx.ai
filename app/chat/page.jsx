"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FaUserTie,
  FaRegQuestionCircle,
  FaRedo,
  FaBook,
  FaArrowRight,
} from "react-icons/fa";
import CircularProgress from "@mui/material/CircularProgress";
import ReactMarkdown from "react-markdown";
import { useUser, UserButton } from "@clerk/nextjs";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Rating from "@mui/material/Rating";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";

// Firebase imports
import { db } from "../lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

function Card({ icon, text, onClick }) {
  return (
    <div
      className="flex-1 poppins-regular min-w-[180px] h-48 rounded-xl cursor-pointer bg-[#1e1f20] text-white p-4 shadow-md hover:bg-[#333] transition duration-200 flex flex-col justify-between"
      onClick={onClick}
    >
      <div>{text}</div>
      <div className="flex justify-end items-end">
        <div className="bg-black p-2 rounded-full">{icon}</div>
      </div>
    </div>
  );
}

const CodeBlock = ({ language, value }) => {
  return (
    <SyntaxHighlighter language={language} style={solarizedlight}>
      {value}
    </SyntaxHighlighter>
  );
};

export default function Page() {
  const { user } = useUser();

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addClass, setAddClass] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [promptCount, setPromptCount] = useState(0);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;

      const shouldAddClass =
        textarea.scrollHeight > 50 || textarea.value.includes("\n");

      if (shouldAddClass !== addClass) {
        setAddClass(shouldAddClass);
      }
    }
  }, [message, addClass]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newUserMessage = { role: "user", content: message };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setMessage("");

    try {
      setIsLoading(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.statusText);
      }

      const responseData = await response.json();
      const assistantMessage = {
        role: "assistant",
        content: responseData.message,
      };

      setMessages((prevMessages) => [...prevMessages, assistantMessage]);

      // Store the conversation in Firebase
      if (user) {
        await addDoc(collection(db, "conversations"), {
          userId: user.id,
          userMessage: newUserMessage,
          aiResponse: assistantMessage,
          timestamp: new Date(),
        });
      }

      // Increase the prompt count
      setPromptCount((prevCount) => prevCount + 1);

      // Show the review modal after two prompts
      if (promptCount === 1 && !reviewSubmitted) {
        setShowReviewModal(true);
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    setMessage(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleCardClick = (text) => {
    setMessage(text);
    sendMessage();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReviewSubmit = async () => {
    if (user) {
      try {
        await addDoc(collection(db, "reviews"), {
          userId: user.id,
          rating: rating,
          reviewText: reviewText,
          timestamp: new Date(),
        });
        console.log("Review submitted successfully");
      } catch (error) {
        console.error("Error submitting review:", error);
      }
    }

    setShowReviewModal(false);
    setReviewSubmitted(true);
  };

  const handleReviewClose = () => {
    setShowReviewModal(false);
  };

  const fetchConversationHistory = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "conversations"),
          where("userId", "==", user.id)
        );
        const querySnapshot = await getDocs(q);
        const history = [];
        querySnapshot.forEach((doc) => {
          history.push(doc.data());
        });
        // Sort history by timestamp
        history.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());

        // Update the messages state with the fetched history
        setMessages(
          history.flatMap((item) => [item.userMessage, item.aiResponse])
        );
      } catch (error) {
        console.error("Error fetching conversation history:", error);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversationHistory();
    }
  }, [user]);

  return (
    <div className="relative ">
      <div className=" p-5">
        <UserButton />
      </div>
      <div className="overflow-y-auto h-[calc(100vh-152px)] w-full relative  sm:px-12 sm:pr-10 sm:pb-0 pb-12  ">
        <div className="max-w-3xl mx-auto  ">
          <div>
            <div className="sm:p-0 p-8">
              <h1 id="user-name">
                Hello{user && <span>, {user.firstName}!</span>}
              </h1>
              <h1 className="text-[#444746] Mixcase-500 text-4xl">
                How can I help you today?
              </h1>
            </div>
            <div className="flex justify-center mt-16  sm:p-0 pl-5 ">
              <div className="flex  gap-2  scroll-hidden overflow-x-auto">
                <Card
                  icon={<FaUserTie className="text-2xl" />}
                  text="what is adigitx.ai?"
                  onClick={() =>
                    handleCardClick(
                      "what is adigitx.ai?"
                    )
                  }
                />
                <Card
                  icon={<FaRegQuestionCircle className="text-2xl" />}
                  text="what is anynominous dev?"
                  onClick={() =>
                    handleCardClick("what is anynominous dev?")
                  }
                />
                <Card
                  icon={<FaRedo className="text-2xl" />}
                  text="is anynominous dev under construction?"
                  onClick={() => handleCardClick("is anynominous dev under construction?")}
                />
                <Card
                  icon={<FaBook className="text-2xl" />}
                  text="what is the use of it?"
                  onClick={() =>
                    handleCardClick(
                      "what is the use of it?"
                    )
                  }
                />
              </div>
            </div>
          </div>
          <div className="p-4 poppins-regular text-sm  w-full">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-2 w-full ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`sm:flex grid  items-start  pb-7 ${
                  msg.role === "user" ? "flex-row-reverse sm:gap-3 " : "flex-row"
                }`}>
                  <div className=" rounded-full w-fit  overflow-hidden object-cover  text-white mt-1">
                    {msg.role === "user" ? (
                      <img
                        src={user?.imageUrl}
                        alt="User Profile"
                        onError={(e) =>
                          (e.target.src =
                            "app/unnamed.png")
                        }
                        className="h-10 w-10"
                      />
                    ) : (
                      <div className=" rounded-full   object-cover overflow-hidden">
                        <img
                          src="https://img.freepik.com/premium-vector/ak-logo-design_731343-612.jpg"
                          alt="Bot Logo"
                          className=" w-10 h-10  "
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className={`ml-2 p-2 pb-1 max-w-md  text-sm ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "text-white"
                    } rounded-3xl`}
                  >
                    {msg.content ? (
                      <ReactMarkdown
                        className="w-full prose prose-invert prose-sm max-w-none"
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-2xl font-bold mb-2"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-bold mb-2" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-bold mb-1" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-4 mb-2" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-4 mb-2" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="mb-1" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="mb-2" {...props} />
                          ),
                          a: ({ node, ...props }) => (
                            <a
                              className="text-blue-300 hover:underline"
                              {...props}
                            />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className="border-l-4 border-gray-500 pl-2 italic"
                              {...props}
                            />
                          ),
                          code: ({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                          }) => {
                            const language = className
                              ? className.replace("language-", "")
                              : "";
                            return inline ? (
                              <code
                                className="rounded overflow-x-auto"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <CodeBlock
                                language={language}
                                value={String(children).replace(/\n$/, "")}
                              />
                            );
                          },
                          pre: ({ node, ...props }) => (
                            <pre
                              className=" rounded overflow-x-auto "
                              {...props}
                            />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <CircularProgress size={24} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}></div>
          </div>
        </div>
      </div>
      <div
        className={`bg-[#1e1f20] poppins-regular text-white max-w-3xl min-h-16 fixed bottom-5 left-1/2 transform scroll-sp -translate-x-1/2 z-50 w-[90%] p-4 shadow-lg flex ${
          addClass ? "rounded-xl" : "rounded-full"
        } ${addClass ? "items-end" : "items-center"}`}
      >
        <textarea
          ref={textareaRef}
          placeholder="Enter a prompt here..."
          className="textarea-field bg-[#1e1f20] flex-grow p-2 border-none focus:outline-none resize-none overflow-y-auto"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          rows="1"
          style={{ maxHeight: "200px", minHeight: "14px" }}
        />
        <FaArrowRight
          className="ml-4 text-xl text-white cursor-pointer"
          onClick={sendMessage}
        />
      </div>

      <Modal
        open={showReviewModal}
        onClose={handleReviewClose}
        aria-labelledby="review-modal-title"
        aria-describedby="review-modal-description"
        className="mx-7"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "#1e1f20",
            boxShadow: 24,
            color: "#fff",
            p: 4,
            borderRadius: 2,
          }}
        >
          <h2 id="review-modal-title" className="poppins-regular">
            Rate Your Experience
          </h2>
          <Rating
            name="user-rating"
            value={rating}
            onChange={(event, newValue) => {
              setRating(newValue);
            }}
            sx={{
              background:
                "linear-gradient(to bottom, #ffd319, #ff2975, #4285f4)", // Gradient for filled stars
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              "& .MuiRating-iconEmpty": {
                color: "rgba(255, 255, 255, 0.5)", // Color for unfilled stars
              },
              "& .MuiRating-iconFilled": {
                background:
                  "linear-gradient(to bottom, #ffd319, #ff2975, #4285f4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              },
            }}
          />
          <TextField
            id="review-modal-description"
            label="Write your review"
            multiline
            rows={4}
            variant="outlined"
            fullWidth
            className="review-area"
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            sx={{
              mt: 2,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.5)", // Border color
                },
                "&:hover fieldset": {
                  borderColor: "#fff", // Border color on hover
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#fff", // Border color when focused
                },
              },
              "& .MuiInputLabel-root": {
                color: "#fff", // Label color changed to white
              },
              "& .MuiInputBase-input": {
                color: "#fff", // Text color
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleReviewSubmit}
            sx={{
              mt: 2,
              background:
                "linear-gradient(to bottom, #ffd319, #ff2975, #4285f4)", // Gradient background
              backgroundSize: "200%", // Ensures smooth transition when hovered
              transition: "background-position 0.5s ease", // Smooth transition effect
              "&:hover": {
                backgroundPosition: "top right", // Change gradient direction on hover
                backgroundImage:
                  "linear-gradient(to top right, #ffd319, #ff2975, #4285f4)", // Apply hover gradient
              },
              color: "#fff", // Text color
            }}
          >
            Review
          </Button>
        </Box>
      </Modal>
    </div>
  );
}
