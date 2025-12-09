import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    VStack,
    HStack,
    Heading,
    Input,
    Text,
    Spinner,
    useToast,
    IconButton,
    InputGroup,
    InputRightElement,
    Container,
    Flex,
    Button,
    Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import * as Lucide from "lucide-react";
const { Send, ArrowLeft, Bot } = Lucide;

// --- Interfaces & Animation Variants ---
interface Message {
    sender: 'user' | 'ai';
    text: string;
}

const messageVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const MotionBox = motion(Box);

// --- Chat Message Component ---
const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <MotionBox
            initial="hidden"
            animate="visible"
            variants={messageVariants}
            alignSelf={isUser ? 'flex-end' : 'flex-start'}
            maxW={{ base: '90%', md: '75%' }}
        >
            <Box
                bg={isUser ? 'transparent' : 'whiteAlpha.100'}
                bgGradient={isUser ? 'linear(to-r, blue.600, purple.600)' : undefined}
                color={isUser ? 'white' : 'gray.200'}
                px={5}
                py={3}
                borderRadius="2xl"
                borderTopRightRadius={isUser ? 'sm' : '2xl'}
                borderTopLeftRadius={!isUser ? 'sm' : '2xl'}
                border="1px solid"
                borderColor={isUser ? 'transparent' : 'whiteAlpha.200'}
                boxShadow="lg"
                position="relative"
                _before={!isUser ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 'inherit',
                    boxShadow: 'inset 0 0 10px rgba(255,255,255,0.05)',
                    pointerEvents: 'none'
                } : undefined}
            >
                <Text whiteSpace="pre-wrap" wordBreak="break-word" fontSize="md" lineHeight="1.6">
                    {message.text}
                </Text>
            </Box>
        </MotionBox>
    );
};

// --- Main Chatbot Component ---
const AIProjectAssistant: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const { projectId } = useParams<{ projectId: string }>(); // Get project ID from URL

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const toast = useToast();

    // Set initial welcome message
    useEffect(() => {
        setMessages([
            { sender: 'ai', text: `I am ready to answer questions about Project ID: ${projectId}. \n\nAsk me about this project's status, viva scores, or student details.` }
        ]);
    }, [projectId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || loading || !projectId) return;

        setLoading(true);
        const userMessage: Message = { sender: 'user', text: prompt };
        setMessages((prev) => [...prev, userMessage]);
        setPrompt('');

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                navigate('/');
                return;
            }

            // Use the NEW project-inquiry endpoint
            const response = await axios.post(
                'http://127.0.0.1:8000/ai/project-inquiry/',
                {
                    prompt: userMessage.text,
                    project_id: projectId // Send the project ID
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const aiMessage: Message = { sender: 'ai', text: response.data.response };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (err: any) {
            console.error('AI Chat Error:', err);
            const errorText = err.response?.data?.error || 'Could not get a response from the server.';
            toast({
                title: 'AI Connection Failed',
                description: errorText,
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top',
            });
            // Add error message to chat
            setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I encountered an error: ${errorText}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Flex
            w="100%"
            h="calc(100vh - 72px)" // Assumes 72px navbar height
            position="relative"
            justify="center"
            align="center"
            color="white"
            bg="transparent"
            overflow="hidden"
        >
            {/* Background Glows */}
            <Box position="absolute" top="10%" left="20%" w="300px" h="300px" bg="purple.600" filter="blur(120px)" opacity={0.2} zIndex={-1} />
            <Box position="absolute" bottom="10%" right="20%" w="300px" h="300px" bg="blue.600" filter="blur(120px)" opacity={0.2} zIndex={-1} />

            <Container maxW="4xl" h="100%" py={{ base: 4, md: 6 }}>
                <Flex
                    direction="column"
                    h="100%"
                    bg="rgba(10, 15, 35, 0.7)"
                    backdropFilter="blur(20px)"
                    border="1px solid rgba(255, 255, 255, 0.1)"
                    borderRadius={{ base: '2xl', md: '3xl' }}
                    boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.37)"
                    overflow="hidden"
                >
                    {/* Header */}
                    <Flex
                        p={4}
                        borderBottom="1px solid"
                        borderColor="whiteAlpha.100"
                        align="center"
                        justify="space-between"
                        bg="whiteAlpha.50"
                    >
                        <Button
                            onClick={() => navigate(-1)}
                            leftIcon={<ArrowLeft size={18} />}
                            variant="ghost"
                            color="gray.400"
                            _hover={{ color: "white", bg: 'whiteAlpha.100' }}
                            size="sm"
                        >
                            Back
                        </Button>
                        <Heading as="h1" size="md" textAlign="center" bgGradient="linear(to-r, blue.400, purple.400)" bgClip="text" display="flex" alignItems="center" gap={2}>
                            <Icon as={Bot} color="purple.400" /> Project AI Assistant
                        </Heading>
                        <Box w="70px" /> {/* Spacer */}
                    </Flex>

                    {/* Chat Window */}
                    <VStack
                        flex="1"
                        spacing={6}
                        p={6}
                        overflowY="auto"
                        bg="transparent"
                        sx={{
                            '&::-webkit-scrollbar': { width: '4px' },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { bg: 'whiteAlpha.200', borderRadius: '24px' },
                        }}
                    >
                        {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                        {loading && (
                            <HStack alignSelf="flex-start" spacing={3} p={2} bg="whiteAlpha.50" borderRadius="xl" px={4} py={2}>
                                <Spinner size="sm" color="purple.400" />
                                <Text color="gray.400" fontSize="sm" fontStyle="italic">AI is analyzing project data...</Text>
                            </HStack>
                        )}
                        <div ref={messagesEndRef} />
                    </VStack>

                    {/* Input Form */}
                    <Box as="form" onSubmit={handleSendMessage} p={5} borderTop="1px solid" borderColor="whiteAlpha.100" bg="rgba(0,0,0,0.2)">
                        <InputGroup size="lg">
                            <Input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={`Ask about Project ${projectId}...`}
                                bg="whiteAlpha.50"
                                color="white"
                                borderColor="whiteAlpha.100"
                                borderRadius="xl"
                                _placeholder={{ color: 'gray.500' }}
                                _hover={{ borderColor: 'purple.500', bg: "whiteAlpha.100" }}
                                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #9F7AEA', bg: "whiteAlpha.100" }}
                                isDisabled={loading}
                                transition="all 0.2s ease"
                                pl={6}
                            />
                            <InputRightElement width="4.5rem">
                                <IconButton
                                    type="submit"
                                    icon={<Send size={20} />}
                                    colorScheme="purple"
                                    variant="solid"
                                    isRound
                                    size="md"
                                    isLoading={loading}
                                    isDisabled={!prompt.trim()}
                                    aria-label="Send Message"
                                    bgGradient="linear(to-r, blue.500, purple.500)"
                                    _hover={{ bgGradient: "linear(to-r, blue.400, purple.400)", transform: "scale(1.05)" }}
                                    _active={{ transform: "scale(0.95)" }}
                                    boxShadow="0 0 15px rgba(128, 90, 213, 0.4)"
                                />
                            </InputRightElement>
                        </InputGroup>
                        <Text fontSize="xs" color="gray.500" textAlign="center" mt={3}>
                            AI can make mistakes. Please verify important information.
                        </Text>
                    </Box>
                </Flex>
            </Container>
        </Flex>
    );
};

export default AIProjectAssistant;