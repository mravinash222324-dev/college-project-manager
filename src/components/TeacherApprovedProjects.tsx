import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
  Container,
  Badge,
  Flex,
  Center,
  HStack,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  SimpleGrid,
  Image,
  Tag,
  Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import * as Lucide from "lucide-react";
import ChatInterface from './ChatInterface';

const {
  BookCopy,
  User,
  MessageSquare,
  History,
  Bot,
  BarChart,
  FileText,
  Image: ImageIcon,
  ExternalLink,
  ArrowLeft,
} = Lucide;

// --- Interfaces ---
interface ApprovedProject {
  id: number;
  submission_id: number;
  title: string;
  student_name: string;
  status: 'In Progress' | 'Completed' | 'Archived' | string;
  progress_percentage: number;
  category: string;
  relevance_score?: number;
  feasibility_score?: number;
  innovation_score?: number;

  // newly added fields
  final_report?: string | null;
  ai_report_feedback?: string | null;

  // team members (optional; backend may provide)
  team_members?: { id: number; username: string; role?: string }[];
  member_stats?: {
    student_id: number;
    username: string;
    updates_count: number;
    reviews_count: number;
    viva_average: number;
  }[];
}

interface Artifact {
  id: number;
  image_file: string;
  description: string;
  extracted_text: string | null;
  ai_tags: string[] | null;
  uploaded_at: string;
}

// chat user shape expected by ChatInterface
interface UserSimple {
  id: number;
  username: string;
  role: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

const TeacherApprovedProjects: React.FC = () => {
  const [projects, setProjects] = useState<ApprovedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  // Selection State
  const [selectedProject, setSelectedProject] = useState<ApprovedProject | null>(null);

  // grading state
  const [gradingLoading, setGradingLoading] = useState<number | null>(null);

  // --- Chat Modal State (uses ChatInterface) ---
  const {
    isOpen: isChatOpen,
    onOpen: onChatOpen,
    onClose: onChatClose,
  } = useDisclosure();
  const [chatProject, setChatProject] = useState<ApprovedProject | null>(null);

  // --- Team Stats Modal State ---
  const {
    isOpen: isStatsOpen,
    onOpen: onStatsOpen,
    onClose: onStatsClose,
  } = useDisclosure();

  // current user for chat
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; role: string } | null>(null);

  // --- Artifacts State & Modal ---
  const {
    isOpen: isArtifactsOpen,
    onOpen: onArtifactsOpen,
    onClose: onArtifactsClose,
  } = useDisclosure();
  const [selectedArtifacts, setSelectedArtifacts] = useState<Artifact[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [currentProjectTitle, setCurrentProjectTitle] = useState('');

  // Fetch Projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { navigate('/'); return; }
      const response = await axios.get('http://127.0.0.1:8000/teacher/approved-projects/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Failed to fetch approved projects.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // --- Load current user (prefer localStorage, fallback to API) ---
  useEffect(() => {
    const loadMe = async () => {
      const idStr = localStorage.getItem('user_id');
      const username = localStorage.getItem('username');
      const role = localStorage.getItem('role');

      if (idStr && username && role) {
        setCurrentUser({ id: Number(idStr), username, role });
        return;
      }

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const res = await axios.get('http://127.0.0.1:8000/auth/users/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;
        setCurrentUser({
          id: data.id,
          username: data.username,
          role: data.role ?? (data.is_staff ? 'Teacher' : 'Student'),
        });
        localStorage.setItem('user_id', String(data.id));
        localStorage.setItem('username', data.username);
        if (data.role) localStorage.setItem('role', data.role);
      } catch (e) {
        console.error('Failed to fetch current user', e);
      }
    };
    loadMe();
  }, []);

  // --- Artifacts Functions ---
  const handleViewArtifacts = async (projectId: number, projectTitle: string) => {
    setCurrentProjectTitle(projectTitle);
    setLoadingArtifacts(true);
    onArtifactsOpen();
    setSelectedArtifacts([]); // clear previous
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`http://127.0.0.1:8000/projects/${projectId}/artifacts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedArtifacts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      toast({ title: 'Failed to load documents', status: 'error' });
      console.error(err);
    } finally {
      setLoadingArtifacts(false);
    }
  };

  // --- Analyze Docs function for final report (improved error handling + refresh) ---
  const handleAutoGrade = async (projectId: number) => {
    setGradingLoading(projectId);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `http://127.0.0.1:8000/projects/${projectId}/report/grade/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Analysis Complete!', status: 'success' });

      // Reload projects to show the new feedback
      const response = await axios.get('http://127.0.0.1:8000/teacher/approved-projects/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(Array.isArray(response.data) ? response.data : []);

      // Also update selected project if it's the one being graded
      if (selectedProject && selectedProject.id === projectId) {
        const updated = (response.data as ApprovedProject[]).find(p => p.id === projectId);
        if (updated) setSelectedProject(updated);
      }

    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        toast({
          title: 'AI Busy',
          description: 'Please wait 1 minute before analyzing another document.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Analysis Failed',
          description: 'Check if report is uploaded.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        console.error('Analyze Docs error:', err);
      }
    } finally {
      setGradingLoading(null);
    }
  };

  const getStatusBadge = (status: ApprovedProject['status']) => {
    switch (status) {
      case 'In Progress': return { colorScheme: 'blue', text: 'In Progress' };
      case 'Completed': return { colorScheme: 'green', text: 'Completed' };
      case 'Archived': return { colorScheme: 'gray', text: 'Archived' };
      default: return { colorScheme: 'cyan', text: String(status) || 'Approved' };
    }
  };

  // --- Open Chat using ChatInterface (passes team members + currentUser) ---
  const openChat = (project: ApprovedProject) => {
    setChatProject(project);
    onChatOpen();
  };

  if (loading) return (
    <Center h="calc(100vh - 72px)" color="gray.400">
      <Spinner size="xl" color="blue.500" thickness="4px" />
      <Text ml={4} fontSize="xl">Loading Projects...</Text>
    </Center>
  );

  // helper to normalize team members for ChatInterface
  const normalizeTeamMembers = (members?: { id: number; username: string; role?: string }[]): UserSimple[] => {
    if (!members || !Array.isArray(members)) return [];
    return members.map(m => ({
      id: m.id,
      username: m.username,
      role: m.role ?? 'Student',
    }));
  };

  // --- Action Card Component ---
  const ActionCard = ({ icon, title, desc, onClick, color }: any) => (
    <MotionBox
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass-card"
      p={6}
      cursor="pointer"
      onClick={onClick}
      position="relative"
      overflow="hidden"
      role="group"
      bg="rgba(255, 255, 255, 0.03)"
      border="1px solid rgba(255, 255, 255, 0.05)"
      backdropFilter="blur(10px)"
      borderRadius="xl"
    >
      <Box position="absolute" top="-20px" right="-20px" opacity={0.1} transform="rotate(15deg)" transition="0.3s" _groupHover={{ transform: 'rotate(0deg) scale(1.2)', opacity: 0.2 }}>
        <Icon as={icon.type} w={100} h={100} color={`${color}.400`} />
      </Box>

      <VStack align="start" spacing={4}>
        <Flex p={4} bg={`${color}.900`} borderRadius="xl" color={`${color}.400`}>
          {icon}
        </Flex>
        <Box>
          <Heading size="md" mb={1} color="gray.200">{title}</Heading>
          <Text color="gray.400" fontSize="sm">{desc}</Text>
        </Box>
      </VStack>
    </MotionBox>
  );

  // --- Render Views ---

  const renderProjectList = () => (
    <VStack spacing={8} w="full">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <Heading as="h1" size="2xl" bgGradient="linear(to-r, blue.400, purple.400)" bgClip="text" fontWeight="extrabold" textAlign="center">
          Approved Projects Monitor
        </Heading>
      </motion.div>

      {error && (
        <Alert status="error" borderRadius="lg" bg="rgba(254, 178, 178, 0.1)" color="red.200" border="1px solid" borderColor="red.500">
          <AlertIcon color="red.400" />
          {error}
        </Alert>
      )}

      {projects.length === 0 && !error ? (
        <Center h="50vh" flexDirection="column">
          <Icon as={BookCopy} size={48} color="gray.600" mb={4} />
          <Text fontSize="xl" color="gray.500">No active projects found.</Text>
        </Center>
      ) : (
        <MotionVStack w="full" spacing={6} variants={containerVariants} initial="hidden" animate="visible">
          {projects.map((project) => {
            const status = getStatusBadge(project.status);
            return (
              <MotionBox
                key={project.id}
                variants={itemVariants}
                w="full"
                p={6}
                borderRadius="xl"
                bg="rgba(255, 255, 255, 0.03)"
                border="1px solid rgba(255, 255, 255, 0.05)"
                backdropFilter="blur(10px)"
                boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
                whileHover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 15px rgba(0, 0, 0, 0.2)', borderColor: "rgba(255, 255, 255, 0.1)" }}
                transition={{ duration: 0.2 }}
                cursor="pointer"
                onClick={() => setSelectedProject(project)}
              >
                <VStack align="stretch" spacing={4}>
                  <Flex justify="space-between" align="center" gap={3} direction={{ base: 'column', md: 'row' }}>
                    <Heading size="md" color="gray.200">{project.title}</Heading>
                    <Badge colorScheme={status.colorScheme} variant="solid" px={3} py={1} borderRadius="full">{status.text}</Badge>
                  </Flex>

                  <HStack spacing={6} color="gray.400" divider={<Text mx={2} color="gray.600">|</Text>} flexWrap="wrap">
                    <HStack>
                      <Icon as={User} size={16} />
                      <Text fontSize="sm">Student: <Text as="span" color="gray.300" fontWeight="bold">{project.student_name}</Text></Text>
                    </HStack>
                    <HStack>
                      <Icon as={BookCopy} size={16} />
                      <Text fontSize="sm">Category: <Text as="span" color="gray.300" fontWeight="bold">{project.category}</Text></Text>
                    </HStack>
                  </HStack>

                  <VStack align="stretch" spacing={2} pt={2}>
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="bold" color="gray.400">Progress</Text>
                      <Text fontWeight="bold" color="blue.400">{project.progress_percentage}%</Text>
                    </HStack>
                    <Progress value={project.progress_percentage} size="sm" colorScheme="blue" borderRadius="full" bg="whiteAlpha.100" />
                  </VStack>

                  <Text fontSize="xs" color="gray.500" fontStyle="italic" textAlign="right">Click to manage project</Text>

                </VStack>
              </MotionBox>
            );
          })}
        </MotionVStack>
      )}
    </VStack>
  );

  const renderProjectTools = () => {
    if (!selectedProject) return null;
    const status = getStatusBadge(selectedProject.status);

    return (
      <VStack spacing={8} w="full" align="stretch">
        <Button
          leftIcon={<ArrowLeft />}
          variant="ghost"
          color="gray.400"
          alignSelf="flex-start"
          onClick={() => setSelectedProject(null)}
          _hover={{ color: "white", bg: "whiteAlpha.100" }}
        >
          Back to Projects
        </Button>

        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          p={8}
          bg="rgba(255, 255, 255, 0.03)"
          border="1px solid rgba(255, 255, 255, 0.05)"
          backdropFilter="blur(10px)"
          borderRadius="xl"
        >
          <Flex justify="space-between" align="start" wrap="wrap" gap={4}>
            <Box>
              <HStack mb={2}>
                <Badge colorScheme={status.colorScheme} px={3} py={1} borderRadius="full">
                  {status.text}
                </Badge>
                <Text color="gray.500" fontSize="sm">ID: #{selectedProject.id}</Text>
              </HStack>
              <Heading size="2xl" bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text" mb={4}>
                {selectedProject.title}
              </Heading>
              <HStack spacing={6} color="gray.400">
                <HStack>
                  <Icon as={User} size={18} />
                  <Text fontSize="md">Student: <Text as="span" color="gray.200" fontWeight="bold">{selectedProject.student_name}</Text></Text>
                </HStack>
                <HStack>
                  <Icon as={BookCopy} size={18} />
                  <Text fontSize="md">Category: <Text as="span" color="gray.200" fontWeight="bold">{selectedProject.category}</Text></Text>
                </HStack>
              </HStack>

              <HStack spacing={4} mt={4}>
                <Badge colorScheme={selectedProject.relevance_score && selectedProject.relevance_score >= 7 ? 'green' : 'yellow'}>
                  Relevance: {selectedProject.relevance_score?.toFixed(1) ?? 'N/A'}
                </Badge>
                <Badge colorScheme={selectedProject.feasibility_score && selectedProject.feasibility_score >= 7 ? 'green' : 'yellow'}>
                  Feasibility: {selectedProject.feasibility_score?.toFixed(1) ?? 'N/A'}
                </Badge>
                <Badge colorScheme={selectedProject.innovation_score && selectedProject.innovation_score >= 7 ? 'green' : 'yellow'}>
                  Innovation: {selectedProject.innovation_score?.toFixed(1) ?? 'N/A'}
                </Badge>
              </HStack>
            </Box>

            <Box minW="200px" p={4} bg="rgba(255,255,255,0.05)" borderRadius="xl">
              <Text color="gray.400" mb={2} fontWeight="bold">Current Progress</Text>
              <Progress value={selectedProject.progress_percentage} size="lg" colorScheme="blue" borderRadius="full" mb={2} bg="blackAlpha.400" />
              <Text fontWeight="bold" fontSize="xl" color="white" textAlign="right">{selectedProject.progress_percentage}%</Text>
            </Box>
          </Flex>
        </MotionBox>

        <Heading size="lg" color="gray.200">Project Tools</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          <ActionCard
            icon={<Bot size={32} />}
            title="AI Assistant"
            desc="Get AI help & insights"
            onClick={() => navigate(`/teacher/project-assistant/${selectedProject.id}`)}
            color="purple"
          />
          <ActionCard
            icon={<History size={32} />}
            title="Viva History"
            desc="Review past viva sessions"
            onClick={() => navigate(`/teacher/projects/${selectedProject.id}/viva-history`)}
            color="teal"
          />
          <ActionCard
            icon={<BarChart size={32} />}
            title="Progress Logs"
            desc="Track student updates"
            onClick={() => navigate(`/teacher/projects/${selectedProject.id}/progress-logs`)}
            color="orange"
          />
          <ActionCard
            icon={<MessageSquare size={32} />}
            title="Team Chat"
            desc="Communicate with students"
            onClick={() => openChat(selectedProject)}
            color="blue"
          />
          <ActionCard
            icon={<User size={32} />}
            title="Team Insights"
            desc="View member contributions"
            onClick={onStatsOpen}
            color="cyan"
          />
          <ActionCard
            icon={<ImageIcon size={32} />}
            title="Documents"
            desc="View uploaded artifacts"
            onClick={() => handleViewArtifacts(selectedProject.id, selectedProject.title)}
            color="pink"
          />
        </SimpleGrid>

        {/* --- DOCUMENTATION & ANALYSIS --- */}
        <Box mt={8} p={6} className="glass-card" border="1px dashed" borderColor="cyan.600" borderRadius="xl" bg="rgba(255,255,255,0.02)">
          <HStack mb={4}>
            <FileText size={24} color="#90CDF4" />
            <Heading size="md" color="cyan.300">Project Documentation</Heading>
          </HStack>

          {selectedProject.final_report ? (
            <VStack align="start" spacing={4}>
              <HStack>
                <Text color="green.300" fontSize="md" fontWeight="bold">✅ Report Uploaded</Text>
                <Button
                  size="sm"
                  colorScheme="green"
                  variant="outline"
                  as="a"
                  href={selectedProject.final_report.startsWith('http') ? selectedProject.final_report : `http://127.0.0.1:8000${selectedProject.final_report}`}
                  target="_blank"
                  leftIcon={<Icon as={ExternalLink} size={14} />}
                  _hover={{ bg: "green.900" }}
                >
                  View PDF
                </Button>
                <Button
                  size="sm"
                  colorScheme="purple"
                  isLoading={gradingLoading === selectedProject.id}
                  onClick={() => handleAutoGrade(selectedProject.id)}
                  leftIcon={<Icon as={Bot} size={14} />}
                >
                  Analyze with AI
                </Button>
              </HStack>

              {selectedProject.ai_report_feedback ? (
                <Box w="full" p={4} bg="blackAlpha.400" borderRadius="md" borderLeft="4px solid" borderColor="orange.400">
                  <HStack mb={2}>
                    <Icon as={Bot} color="orange.400" />
                    <Text fontWeight="bold" color="orange.300" fontSize="sm">AI Analysis Result:</Text>
                  </HStack>
                  <Text fontSize="sm" whiteSpace="pre-wrap" color="gray.300">
                    {selectedProject.ai_report_feedback}
                  </Text>
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.400">Run AI analysis to get feedback on the report.</Text>
              )}
            </VStack>
          ) : (
            <Text fontSize="md" color="gray.400">No documentation uploaded by the student yet.</Text>
          )}
        </Box>
      </VStack >
    );
  };

  return (
    <Flex w="100%" minH="calc(100vh - 72px)" justify="center" position="relative" color="white" bg="transparent">
      <Container maxW="container.xl" h="100%" overflowY="auto" py={{ base: 6, md: 8 }}>
        {selectedProject ? renderProjectTools() : renderProjectList()}
      </Container>

      {/* ----------------------------- CHAT MODAL (uses ChatInterface) ----------------------------- */}
      <Modal isOpen={isChatOpen} onClose={() => { setChatProject(null); onChatClose(); }} size="xl">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
        <ModalContent
          bg="rgba(10, 15, 35, 0.95)"
          color="white"
          boxShadow="0 0 40px rgba(0,0,0,0.5)"
          borderRadius="xl"
          border="1px solid rgba(255,255,255,0.1)"
        >
          <ModalHeader px={6} pt={6} pb={0} color="gray.200" borderBottom="1px solid rgba(255,255,255,0.05)">Project Messages</ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: "white" }} />
          <ModalBody px={6} pb={6}>
            {chatProject && currentUser ? (
              <ChatInterface
                projectId={chatProject.id}
                currentUser={currentUser}
                teamMembers={normalizeTeamMembers(chatProject.team_members)}
              />
            ) : chatProject && !currentUser ? (
              <Center><Spinner color="blue.500" /></Center>
            ) : (
              <Center><Text color="gray.500">Select a project to view messages.</Text></Center>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ----------------------------- TEAM STATS MODAL ----------------------------- */}
      <Modal isOpen={isStatsOpen} onClose={onStatsClose} size="3xl">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
        <ModalContent bg="rgba(15, 20, 40, 0.98)" color="white" borderRadius="xl" border="1px solid rgba(255,255,255,0.1)">
          <ModalHeader borderBottom="1px solid" borderColor="whiteAlpha.100" color="cyan.400">
            Team Contribution Insights
          </ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: "white" }} />
          <ModalBody p={6}>
            {!selectedProject?.member_stats ? (
              <Text color="gray.500">No data available for this project.</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {selectedProject.member_stats.map((stat) => (
                  <Box key={stat.student_id} p={4} bg="whiteAlpha.50" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.100">
                    <Heading size="sm" color="white" mb={4}>{stat.username}</Heading>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Text color="gray.400" fontSize="sm">Progress Updates:</Text>
                        <Badge colorScheme="blue">{stat.updates_count}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.400" fontSize="sm">Code Reviews:</Text>
                        <Badge colorScheme="purple">{stat.reviews_count}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.400" fontSize="sm">Viva Avg Score:</Text>
                        <Badge colorScheme={stat.viva_average >= 7 ? 'green' : (stat.viva_average >= 5 ? 'yellow' : 'red')} variant="outline">
                          {stat.viva_average}/10
                        </Badge>
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            )}
            {selectedProject?.member_stats && selectedProject.member_stats.length === 0 && (
              <Text color="gray.500" fontStyle="italic">No team member stats found.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onStatsClose} variant="ghost" color="gray.400">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ----------------------------- ARTIFACTS MODAL ----------------------------- */}
      <Modal isOpen={isArtifactsOpen} onClose={onArtifactsClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
        <ModalContent
          bg="rgba(15, 20, 40, 0.98)"
          color="white"
          borderRadius="xl"
          boxShadow="2xl"
          border="1px solid rgba(255,255,255,0.1)"
        >
          <ModalHeader borderBottom="1px solid" borderColor="whiteAlpha.100" color="gray.200">Documents for: {currentProjectTitle}</ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: "white" }} />
          <ModalBody p={6}>
            {loadingArtifacts ? (
              <Center py={10}><Spinner color="blue.500" /><Text ml={3} color="gray.300">Loading documents...</Text></Center>
            ) : selectedArtifacts.length === 0 ? (
              <VStack py={10} spacing={4}>
                <Icon as={FileText} size={48} color="gray.600" />
                <Text color="gray.500">No documents or screenshots uploaded yet.</Text>
              </VStack>
            ) : (
              <VStack spacing={8} align="stretch">
                {selectedArtifacts.map((art) => (
                  <Box key={art.id} bg="whiteAlpha.50" p={4} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.100">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      {/* Left: Image */}
                      <Box>
                        <Image
                          src={art.image_file.startsWith('http') ? art.image_file : `http://127.0.0.1:8000${art.image_file}`}
                          alt="Project Artifact"
                          borderRadius="md"
                          objectFit="contain"
                          maxH="400px"
                          bg="blackAlpha.500"
                        />
                        <Text mt={2} fontSize="sm" color="gray.500" textAlign="center">
                          Uploaded: {new Date(art.uploaded_at).toLocaleDateString()}
                        </Text>
                      </Box>

                      {/* Right: AI Analysis */}
                      <VStack align="stretch" spacing={4}>
                        <Box>
                          <Text fontWeight="bold" color="purple.300" mb={1}>Description:</Text>
                          <Text color="gray.300">{art.description || 'No description provided.'}</Text>
                        </Box>

                        {art.ai_tags && art.ai_tags.length > 0 && (
                          <Box>
                            <Text fontWeight="bold" color="blue.300" mb={2}>AI Tags:</Text>
                            <HStack wrap="wrap">
                              {art.ai_tags.map((tag, i) => (
                                <Tag key={i} colorScheme="blue" size="sm" variant="solid" borderRadius="full">{tag}</Tag>
                              ))}
                            </HStack>
                          </Box>
                        )}

                        <Box>
                          <Text fontWeight="bold" color="green.300" mb={1}>Extracted Text (OCR):</Text>
                          <Box
                            maxH="200px"
                            overflowY="auto"
                            p={3}
                            bg="blackAlpha.400"
                            borderRadius="md"
                            fontSize="sm"
                            fontFamily="monospace"
                            border="1px solid"
                            borderColor="whiteAlpha.100"
                            color="gray.400"
                            css={{ '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { background: '#4A5568' } }}
                          >
                            {art.extracted_text || 'No text extracted.'}
                          </Box>
                        </Box>
                      </VStack>
                    </SimpleGrid>
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="whiteAlpha.100">
            <Button colorScheme="gray" onClick={onArtifactsClose} variant="ghost" color="gray.300" _hover={{ bg: "whiteAlpha.100" }}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default TeacherApprovedProjects;
