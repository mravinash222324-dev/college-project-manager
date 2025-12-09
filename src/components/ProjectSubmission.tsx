// frontend/src/components/ProjectSubmissionNew.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    VStack,
    Heading,
    Input,
    Textarea,
    Button,
    FormControl,
    FormLabel,
    Alert,
    AlertIcon,
    Text,
    useToast,
    Container,
    HStack,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    SimpleGrid,
    Badge,
    Flex,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import * as Lucide from "lucide-react";
import Layout from './Layout';

const { FileText, Mic, Send, AlertTriangle, Star, Zap } = Lucide;

const MotionBox = motion(Box);

interface SimilarProject {
    title: string;
    abstract_text: string;
    student: string;
}

interface AiReport {
    detail: string;
    suggestions: string;
    similar_project: SimilarProject | null;
    relevance_score: number;
    feasibility_score: number;
    innovation_score: number;
}

interface AlumniProject {
    id: number;
    title: string;
    student: {
        username: string;
    };
    innovation_score: number;
    abstract_text: string;
    submitted_at: string;
}

const ProjectSubmission: React.FC = () => {
    // Form state
    const [title, setTitle] = useState('');
    const [abstractText, setAbstractText] = useState('');
    const [abstractFile, setAbstractFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);


    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [alumniProjects, setAlumniProjects] = useState<AlumniProject[]>([]);

    // --- (NEW) State for 2-Stage Submit ---
    const { isOpen, onOpen, onClose } = useDisclosure(); // For the modal
    const [aiReport, setAiReport] = useState<AiReport | null>(null);
    // We use a ref to hold the FormData to avoid state update issues
    const formDataRef = useRef<FormData | null>(null);

    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        fetchAlumniProjects();
    }, []);

    const fetchAlumniProjects = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/alumni/top-projects/');
            setAlumniProjects(response.data);
        } catch (err) {
            console.error("Failed to fetch alumni projects", err);
        }
    };

    // --- (UPDATED) This is Stage 3: Force Submit ---
    const handleForceSubmit = async () => {
        if (!formDataRef.current || !aiReport) return;

        setIsSubmitting(true);
        onClose(); // Close the modal

        // Add the new 'force' and AI data to the form
        formDataRef.current.append('force_submit', 'true');
        formDataRef.current.append('ai_suggested_features', aiReport.suggestions || 'None');
        formDataRef.current.append(
            'ai_similarity_report',
            aiReport.similar_project ? JSON.stringify(aiReport.similar_project) : 'null'
        );

        formDataRef.current.append('relevance_score', aiReport.relevance_score.toString());
        formDataRef.current.append('feasibility_score', aiReport.feasibility_score.toString());
        formDataRef.current.append('innovation_score', aiReport.innovation_score.toString());

        try {
            const token = localStorage.getItem('accessToken');
            await axios.post('http://127.0.0.1:8000/projects/submit/', formDataRef.current, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            toast({
                title: 'Submission Acknowledged!',
                description: "Your project was submitted with the AI's feedback. Your teacher will review it.",
                status: 'success',
                duration: 5000,
                isClosable: true,
                position: 'top',
            });
            setTimeout(() => navigate('/student-dashboard'), 2000);

        } catch (err: any) {
            setError('Submission failed. Please try again later.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
            formDataRef.current = null;
        }
    };

    // --- (MODIFIED) This is Stage 1: Analyze ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setAiReport(null);
        formDataRef.current = null;

        if (!title.trim() || (!abstractText.trim() && !audioFile)) {
            setError('Project Title and Abstract (Text or Audio) are required.');
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('abstract_text', abstractText);
        if (abstractFile) formData.append('abstract_file', abstractFile);
        if (audioFile) formData.append('audio_file', audioFile);


        formDataRef.current = formData;

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                navigate('/');
                return;
            }

            await axios.post('http://127.0.0.1:8000/projects/submit/', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            toast({
                title: 'Submission Successful!',
                description: 'Your project (Original Idea) has been sent for review.',
                status: 'success',
                duration: 5000,
                isClosable: true,
                position: 'top',
            });
            setTimeout(() => navigate('/student-dashboard'), 2000);

        } catch (err: any) {
            if (err.response && err.response.status === 409) {
                setAiReport(err.response.data);
                onOpen();
            } else if (err.response && err.response.status === 429) {
                setError(err.response.data.detail || 'AI Analyzer is busy. Please try again in one minute.');
            } else {
                setError('Submission failed. Please check your inputs and try again.');
                console.error(err);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyles = {
        bg: "rgba(0,0,0,0.2)",
        color: "white",
        borderColor: "whiteAlpha.200",
        _hover: { borderColor: 'cyan.400', bg: "whiteAlpha.100" },
        _focus: { borderColor: 'cyan.300', boxShadow: '0 0 0 1px cyan', bg: "whiteAlpha.100" },
        borderRadius: "xl",
        py: 6
    };

    // Prepare alumni project elements
    const alumniProjectElements = alumniProjects.slice(0, 3).map((project) => (
        <MotionBox
            key={project.id}
            className="glass-card"
            p={5}
            whileHover={{ scale: 1.02, borderColor: 'orange.400' }}
            border="1px solid"
            borderColor="whiteAlpha.100"
            bg="rgba(0,0,0,0.3)"
        >
            <HStack justify="space-between" mb={2}>
                <Badge colorScheme="orange" variant="solid" borderRadius="full" px={2}>
                    <HStack spacing={1}>
                        <Star size={10} />
                        <Text>{project.innovation_score.toFixed(1)}</Text>
                    </HStack>
                </Badge>
                <Text fontSize="xs" color="gray.500">{new Date(project.submitted_at).getFullYear()}</Text>
            </HStack>
            <Heading size="sm" color="white" mb={2} noOfLines={2}>{project.title}</Heading>
            <Text fontSize="xs" color="gray.400" mb={3}>by {project.student.username}</Text>
            <Text fontSize="sm" color="gray.300" noOfLines={3}>{project.abstract_text}</Text>
        </MotionBox>
    ));

    return (
        <Layout userRole="Student">
            <Container maxW="container.xl" py={{ base: 6, md: 10 }}>

                <Flex direction={{ base: 'column', lg: 'row' }} gap={8}>
                    {/* LEFT COLUMN: Submission Form */}
                    <Box flex="2">
                        <MotionBox
                            bg="rgba(10, 15, 40, 0.6)"
                            border="1px solid rgba(255, 255, 255, 0.1)"
                            borderRadius="3xl"
                            boxShadow="0 0 80px rgba(0, 255, 255, 0.1)"
                            backdropFilter="blur(20px)"
                            p={{ base: 6, md: 10 }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="glass-card"
                        >
                            <VStack as="form" onSubmit={handleSubmit} spacing={6} align="stretch">
                                <Box mb={4}>
                                    <Heading as="h1" size="xl" bgGradient="linear(to-r, cyan.400, blue.400)" bgClip="text" fontWeight="extrabold">
                                        Submit New Project
                                    </Heading>
                                    <Text color="gray.400" mt={2}>Pitch your idea to the AI committee for approval.</Text>
                                </Box>

                                {error && (
                                    <Alert status="error" borderRadius="xl" bg="rgba(255,0,0,0.1)" border="1px solid rgba(255,0,0,0.3)">
                                        <AlertIcon color="red.300" />{error}
                                    </Alert>
                                )}

                                <FormControl isRequired>
                                    <FormLabel color="cyan.200" fontWeight="bold">Project Title</FormLabel>
                                    <Input placeholder="e.g., AI-Powered Traffic Management System" value={title} onChange={(e) => setTitle(e.target.value)} {...inputStyles} />
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel color="cyan.200" fontWeight="bold">Abstract (Text)</FormLabel>
                                    <Textarea
                                        placeholder="Describe your project's goals, methods, and technologies..."
                                        rows={8}
                                        value={abstractText}
                                        onChange={(e) => setAbstractText(e.target.value)}
                                        {...inputStyles}
                                        py={4}
                                    />
                                </FormControl>



                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                                    <FormControl>
                                        <FormLabel color="cyan.200" fontWeight="bold">Upload Abstract (PDF)</FormLabel>
                                        <Box
                                            border="2px dashed"
                                            borderColor="whiteAlpha.300"
                                            borderRadius="xl"
                                            p={6}
                                            textAlign="center"
                                            _hover={{ borderColor: 'cyan.400', bg: 'whiteAlpha.05' }}
                                            cursor="pointer"
                                            position="relative"
                                        >
                                            <Input
                                                type="file"
                                                name="abstract_file"
                                                accept=".pdf"
                                                onChange={(e) => setAbstractFile(e.target.files ? e.target.files[0] : null)}
                                                opacity={0}
                                                position="absolute"
                                                top={0}
                                                left={0}
                                                w="full"
                                                h="full"
                                                cursor="pointer"
                                            />
                                            <VStack spacing={2}>
                                                <FileText size={32} color={abstractFile ? "#48BB78" : "#A0AEC0"} />
                                                <Text color={abstractFile ? "green.300" : "gray.400"} fontSize="sm">
                                                    {abstractFile ? abstractFile.name : "Click to upload PDF"}
                                                </Text>
                                            </VStack>
                                        </Box>
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel color="cyan.200" fontWeight="bold">Upload Audio Summary</FormLabel>
                                        <Box
                                            border="2px dashed"
                                            borderColor="whiteAlpha.300"
                                            borderRadius="xl"
                                            p={6}
                                            textAlign="center"
                                            _hover={{ borderColor: 'cyan.400', bg: 'whiteAlpha.05' }}
                                            cursor="pointer"
                                            position="relative"
                                        >
                                            <Input
                                                type="file"
                                                name="audio_file"
                                                accept=".mp3,.wav"
                                                onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)}
                                                opacity={0}
                                                position="absolute"
                                                top={0}
                                                left={0}
                                                w="full"
                                                h="full"
                                                cursor="pointer"
                                            />
                                            <VStack spacing={2}>
                                                <Mic size={32} color={audioFile ? "#48BB78" : "#A0AEC0"} />
                                                <Text color={audioFile ? "green.300" : "gray.400"} fontSize="sm">
                                                    {audioFile ? audioFile.name : "Click to upload Audio"}
                                                </Text>
                                            </VStack>
                                        </Box>
                                    </FormControl>
                                </SimpleGrid>

                                <Button
                                    type="submit"
                                    size="lg"
                                    mt={4}
                                    h="60px"
                                    isLoading={isSubmitting}
                                    loadingText="AI Analyzing..."
                                    bgGradient="linear(to-r, cyan.500, blue.600)"
                                    color="white"
                                    leftIcon={<Send size={20} />}
                                    _hover={{
                                        bgGradient: "linear(to-r, cyan.400, blue.500)",
                                        boxShadow: "0 0 25px rgba(0,255,255,0.4)",
                                        transform: 'translateY(-2px)'
                                    }}
                                    transition="all 0.3s ease"
                                    fontSize="lg"
                                    borderRadius="xl"
                                >
                                    {isSubmitting ? 'Analyzing...' : 'Analyze & Submit Idea'}
                                </Button>
                            </VStack>
                        </MotionBox>
                    </Box>

                    {/* RIGHT COLUMN: Top Alumni Projects */}
                    <Box flex="1">
                        <MotionBox
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <HStack mb={6} spacing={3}>
                                <Box p={2} bg="orange.500" borderRadius="lg" boxShadow="0 0 15px orange">
                                    <Star size={24} color="white" />
                                </Box>
                                <Heading size="lg" color="orange.300">Top Alumni Projects</Heading>
                            </HStack>

                            <VStack spacing={4} align="stretch">
                                {alumniProjects.length === 0 ? (
                                    <Text color="gray.500">No alumni projects found.</Text>
                                ) : (
                                    alumniProjectElements
                                )}
                                <Button
                                    variant="outline"
                                    colorScheme="orange"
                                    w="full"
                                    mt={2}
                                    onClick={() => navigate('/top-projects')}
                                    _hover={{ bg: 'orange.900', borderColor: 'orange.400' }}
                                >
                                    View All Alumni Projects
                                </Button>
                            </VStack>

                            <Box mt={8} p={6} bg="blue.900" borderRadius="2xl" border="1px dashed" borderColor="blue.500">
                                <HStack mb={3}>
                                    <Zap size={24} color="#63B3ED" />
                                    <Heading size="md" color="blue.300">Tip for Success</Heading>
                                </HStack>
                                <Text color="blue.100" fontSize="sm">
                                    Projects with high innovation scores often solve real-world problems using unique approaches. Check out the alumni projects above for inspiration!
                                </Text>
                            </Box>
                        </MotionBox>
                    </Box>
                </Flex>

            </Container>

            {/* --- CONFIRMATION MODAL --- */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
                <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
                <ModalContent bg="#1A202C" color="white" border="1px solid" borderColor="orange.400">
                    <ModalHeader>
                        <HStack>
                            <AlertTriangle color="#FFB86C" />
                            <Text color="orange.200">AI Feedback: High Similarity</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <Text>{aiReport?.detail}</Text>

                            {aiReport?.similar_project && (
                                <Box mt={2} p={3} bg="rgba(0,0,0,0.3)" borderRadius="md">
                                    <Text color="gray.300" fontWeight="bold">Most Similar Project:</Text>
                                    <Text color="white" mt={1}><strong>Title:</strong> {aiReport.similar_project.title}</Text>
                                    <Text color="white" mt={1}><strong>Student:</strong> {aiReport.similar_project.student}</Text>
                                </Box>
                            )}

                            {aiReport?.suggestions && (
                                <Box>
                                    <Text color="orange.200" fontWeight="bold" mb={2}>AI Suggestions to Make Your Idea Unique:</Text>
                                    <Text color="white" whiteSpace="pre-wrap" fontSize="sm" p={2} bg="blackAlpha.300" borderRadius="md">
                                        {aiReport.suggestions}
                                    </Text>
                                </Box>
                            )}

                            {aiReport && (
                                <Box p={3} bg="rgba(255,255,255,0.03)" borderRadius="md">
                                    <Text fontWeight="bold" mb={2}>AI Scores</Text>
                                    <Text>Relevance: {aiReport.relevance_score}</Text>
                                    <Text>Feasibility: {aiReport.feasibility_score}</Text>
                                    <Text>Innovation: {aiReport.innovation_score}</Text>
                                </Box>
                            )}

                            <Text fontWeight="bold" color="white" mt={4}>
                                Do you want to submit this project anyway for your teacher to review?
                            </Text>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose} _hover={{ bg: 'whiteAlpha.200' }}>
                            Cancel (I'll edit)
                        </Button>
                        <Button colorScheme="orange" onClick={handleForceSubmit} isLoading={isSubmitting}>
                            Submit Anyway
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Layout>
    );
};

export default ProjectSubmission;
