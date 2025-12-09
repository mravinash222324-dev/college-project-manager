// frontend/src/components/TeacherDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Badge,
  Spinner,
  useToast,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Icon,
  HStack,
  VStack,
  Avatar,
  Divider,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Input,
  Alert,
  AlertIcon,
  Tag,
  Spacer,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  LogOut,
  BookOpen,
  MonitorPlay,
  GraduationCap,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  User,
  Settings,
  Bell,
} from "lucide-react";

// Sub-components
import TeacherAssignmentManager from './TeacherAssignmentManager';
import TeacherApprovedProjects from './TeacherApprovedProjects';
import TeacherProfile from './TeacherProfile';
import NotificationBell from './NotificationBell';

const MotionBox = motion(Box);

// --- Interfaces ---
interface Submission {
  id: number;
  title: string;
  group_name: string;
  student: { username: string; first_name?: string; last_name?: string } | null;
  relevance_score: number | null;
  feasibility_score: number | null;
  innovation_score: number | null;
  abstract_text: string;
  status: 'Submitted' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Archived';
  project_id: number | null;
  created_at?: string;
  tags?: string[] | null;
  ai_summary?: string | null;
  ai_similarity_report?: { title: string; abstract_text: string; student: string } | null;
  ai_suggested_features?: string | null;
}

interface DashboardStats {
  pending_approvals: number;
  active_projects: number;
  active_assignments: number;
  vivas_scheduled: number;
}

interface ActivityItem {
  id: string;
  type: 'submission' | 'message' | 'system';
  text: string;
  time: string; // ISO string
}

interface Message {
  id: number;
  sender_username: string;
  recipient_username: string;
  content: string;
  timestamp: string;
}

const TeacherDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'approvals' | 'assignments' | 'monitoring' | 'profile' | 'unappointed'>('overview');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [unappointedSubmissions, setUnappointedSubmissions] = useState<Submission[]>([]); // State for unappointed
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real Data State
  const [stats, setStats] = useState<DashboardStats>({
    pending_approvals: 0,
    active_projects: 0,
    active_assignments: 0,
    vivas_scheduled: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Messaging State
  const { isOpen: isMsgOpen, onOpen: onMsgOpen, onClose: onMsgClose } = useDisclosure();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [msgError, setMsgError] = useState('');

  // Drawer State
  const { isOpen, onOpen, onClose } = useDisclosure();

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    // Role check removed as unused, but logic kept implicitly
  }, []);

  // Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Stats & Activity
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, activityRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/teacher/stats/', { headers }),
        axios.get('http://127.0.0.1:8000/teacher/activity/', { headers })
      ]);

      setStats(statsRes.data);
      setActivities(activityRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  useEffect(() => {
    if (activeView === 'overview') {
      fetchDashboardData();
      fetchUnappointedSubmissions();
    }
  }, [activeView]);

  // Fetch Submissions for "Approvals" view (Appointed)
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://127.0.0.1:8000/teacher/appointed/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(response.data);
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to fetch submissions', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Unappointed Submissions
  const fetchUnappointedSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://127.0.0.1:8000/teacher/unappointed/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnappointedSubmissions(response.data);
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to fetch unappointed projects', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'approvals') {
      fetchSubmissions();
    } else if (activeView === 'unappointed') {
      fetchUnappointedSubmissions();
    }
  }, [activeView]);

  const handleReview = async (submissionId: number, status: 'Approved' | 'Rejected') => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://127.0.0.1:8000/teacher/submissions/${submissionId}/`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: `Submission ${status}`, status: status === 'Approved' ? 'success' : 'info' });
      fetchSubmissions(); // Refresh appointed
      fetchUnappointedSubmissions(); // Refresh unappointed
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Action failed', status: 'error' });
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const scoreColor = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'gray';
    if (score >= 7.5) return 'cyan';
    if (score >= 5) return 'yellow';
    return 'red';
  };

  // Messaging Logic
  const fetchMessages = useCallback(async (projectId: number) => {
    setLoadingMessages(true);
    setMsgError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`http://127.0.0.1:8000/projects/${projectId}/messages/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(response.data);
    } catch (err) {
      setMsgError('Failed to load messages.');
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openMessageModal = (projectId: number) => {
    setSelectedProjectId(projectId);
    setMessages([]);
    fetchMessages(projectId);
    onMsgOpen();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProjectId) return;
    setSendingMessage(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `http://127.0.0.1:8000/projects/${selectedProjectId}/messages/`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const addedMessages = Array.isArray(response.data) ? response.data : [response.data];
      setMessages((prev) => [...prev, ...addedMessages]);
      setNewMessage('');
      toast({ title: 'Message Sent', status: 'success', duration: 2000, isClosable: true });
    } catch (err) {
      toast({ title: 'Error Sending Message', status: 'error', duration: 3000, isClosable: true });
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  // --- Views ---

  const OverviewView = () => {
    const greeting = currentTime.getHours() < 12 ? 'Good Morning' : currentTime.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
      <VStack spacing={8} align="stretch">
        {/* Welcome Header */}
        <Flex justify="space-between" align="flex-end" mb={4}>
          <Box>
            <Text fontSize="sm" color="blue.400" fontWeight="bold" letterSpacing="wide" mb={1}>
              DASHBOARD OVERVIEW
            </Text>
            <Heading size="2xl" bgGradient="linear(to-r, white, gray.400)" bgClip="text">
              {greeting}, Professor
            </Heading>
          </Box>
          <VStack align="end" spacing={0}>
            <Text fontSize="4xl" fontWeight="bold" fontFamily="monospace" color="cyan.400" lineHeight="1">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text fontSize="md" color="gray.500">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </VStack>
        </Flex>

        {/* Stats Row with Visuals */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          {[
            { label: "Pending Reviews", value: stats.pending_approvals, icon: Clock, color: "orange.400", trend: "Needs Action", view: 'approvals' },
            { label: "Other Group Projects", value: unappointedSubmissions.length, icon: Activity, color: "blue.400", trend: "Unappointed", view: 'unappointed' },
            { label: "Assignments", value: stats.active_assignments, icon: BookOpen, color: "purple.400", trend: "Active Now", view: 'assignments' },
            { label: "Viva Monitoring", value: stats.vivas_scheduled, icon: GraduationCap, color: "green.400", trend: "Upcoming", view: 'monitoring' },
          ].map((stat, index) => (
            <Box
              key={index}
              p={6}
              borderRadius="2xl"
              bg="rgba(255, 255, 255, 0.03)"
              border="1px solid rgba(255, 255, 255, 0.05)"
              backdropFilter="blur(10px)"
              position="relative"
              overflow="hidden"
              cursor="pointer"
              onClick={() => setActiveView(stat.view as any)}
              _hover={{ borderColor: stat.color, transform: 'scale(1.01)', transition: 'all 0.2s', boxShadow: `0 0 20px ${stat.color}40` }}
            >
              {/* Decorative Gradient Blob */}
              <Box
                position="absolute"
                top="-50%"
                right="-50%"
                w="150px"
                h="150px"
                bg={stat.color}
                filter="blur(60px)"
                opacity={0.2}
              />

              <Flex justify="space-between" align="start" mb={4}>
                <Box p={3} borderRadius="xl" bg={`${stat.color}20`}>
                  <Icon as={stat.icon} size={24} color={stat.color} />
                </Box>
                <Badge colorScheme="gray" variant="solid" bg="whiteAlpha.200" borderRadius="full" px={2} fontSize="xs">
                  {stat.trend}
                </Badge>
              </Flex>
              <Stat>
                <StatLabel color="gray.400" fontSize="sm">{stat.label}</StatLabel>
                <StatNumber fontSize="4xl" fontWeight="bold" color="white">{stat.value}</StatNumber>
              </Stat>

              {/* Mini Progress Bar Visual */}
              <Progress value={70} size="xs" colorScheme={stat.color.split('.')[0]} mt={4} borderRadius="full" bg="whiteAlpha.100" />
            </Box>
          ))}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
          {/* Quick Actions */}
          <Box gridColumn={{ lg: "span 2" }}>
            <Heading size="md" mb={6} color="gray.300" display="flex" alignItems="center" gap={2}>
              <Icon as={TrendingUp} color="cyan.400" /> Quick Actions
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <Button
                height="120px"
                variant="solid"
                bg="whiteAlpha.200"
                borderColor="whiteAlpha.300"
                borderWidth="1px"
                backdropFilter="blur(10px)"
                _hover={{ bg: "whiteAlpha.300", borderColor: "blue.400", boxShadow: "0 0 25px rgba(66, 153, 225, 0.4)", transform: "translateY(-2px)" }}
                onClick={() => setActiveView('assignments')}
                display="flex"
                flexDir="column"
                gap={3}
                borderRadius="xl"
              >
                <Icon as={BookOpen} size={32} color="blue.400" />
                <Text fontSize="lg">Create Assignment</Text>
              </Button>
              <Button
                height="120px"
                variant="solid"
                bg="whiteAlpha.200"
                borderColor="whiteAlpha.300"
                borderWidth="1px"
                backdropFilter="blur(10px)"
                _hover={{ bg: "whiteAlpha.300", borderColor: "green.400", boxShadow: "0 0 25px rgba(72, 187, 120, 0.4)", transform: "translateY(-2px)" }}
                onClick={() => setActiveView('approvals')}
                display="flex"
                flexDir="column"
                gap={3}
                borderRadius="xl"
              >
                <Icon as={CheckSquare} size={32} color="green.400" />
                <Text fontSize="lg">Review Submissions</Text>
              </Button>
              <Button
                height="120px"
                variant="solid"
                bg="whiteAlpha.200"
                borderColor="whiteAlpha.300"
                borderWidth="1px"
                backdropFilter="blur(10px)"
                _hover={{ bg: "whiteAlpha.300", borderColor: "red.400", boxShadow: "0 0 25px rgba(245, 101, 101, 0.4)", transform: "translateY(-2px)" }}
                onClick={() => toast({ title: "AI Risk Analysis Started", description: "Analyzing student patterns...", status: "info" })} // Placeholder for full logic
                display="flex"
                flexDir="column"
                gap={3}
                borderRadius="xl"
              >
                <Icon as={AlertTriangle} size={32} color="red.400" />
                <Text fontSize="lg">AI Risk Radar</Text>
              </Button>
            </SimpleGrid>
          </Box>

          {/* Activity Feed */}
          <Box
            bg="rgba(0,0,0,0.4)"
            p={6}
            borderRadius="2xl"
            border="1px solid rgba(255,255,255,0.05)"
            backdropFilter="blur(10px)"
          >
            <Heading size="md" mb={6} color="gray.300" display="flex" alignItems="center" gap={2}>
              <Icon as={Activity} color="orange.400" /> Recent Activity
            </Heading>
            <VStack align="stretch" spacing={4} maxH="400px" overflowY="auto" css={{ '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { background: '#4A5568' } }}>
              {activities.length === 0 ? (
                <Text color="gray.500" fontSize="sm">No recent activity.</Text>
              ) : (
                activities.map((activity) => (
                  <HStack key={activity.id} spacing={4} p={3} borderRadius="lg" _hover={{ bg: "whiteAlpha.50" }}>
                    <Box p={2} bg="whiteAlpha.100" borderRadius="full">
                      <Icon as={activity.type === 'message' ? MessageSquare : activity.type === 'system' ? Bell : CheckCircle} size={16} color="gray.300" />
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.200" noOfLines={2}>{activity.text}</Text>
                      <Text fontSize="xs" color="gray.500">{formatTimeAgo(activity.time)}</Text>
                    </Box>
                  </HStack>
                ))
              )}
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack >
    );
  };

  const ApprovalsView = () => (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">Project Approvals</Heading>
        <Badge colorScheme="orange" p={2} borderRadius="md">{submissions.length} Pending</Badge>
      </Flex>

      {loading ? (
        <Flex justify="center" p={10}><Spinner /></Flex>
      ) : submissions.length === 0 ? (
        <Flex direction="column" align="center" justify="center" h="300px" bg="whiteAlpha.50" borderRadius="xl">
          <Icon as={CheckCircle} size={48} color="green.400" mb={4} />
          <Text color="gray.400">All caught up! No pending submissions.</Text>
        </Flex>
      ) : (
        <VStack spacing={4} align="stretch">
          <AnimatePresence>
            {submissions.map((sub) => (
              <MotionBox
                key={sub.id}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                transition={{ duration: 0.3 }}
                p={6}
                borderRadius="xl"
                bg="rgba(255, 255, 255, 0.03)"
                border="1px solid rgba(255, 255, 255, 0.05)"
                backdropFilter="blur(5px)"
                whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <HStack justify="space-between" mb={4}>
                  <Badge colorScheme="yellow">Submitted</Badge>
                  <Text fontSize="xs" color="gray.500">{new Date(sub.created_at || Date.now()).toLocaleDateString()}</Text>
                </HStack>
                <Heading size="md" mb={2}>{sub.title}</Heading>
                <Text fontSize="sm" color="gray.400" mb={4} noOfLines={3}>{sub.abstract_text}</Text>

                {sub.student && (
                  <HStack mb={4}>
                    <Avatar size="xs" name={sub.student.username} />
                    <Text fontSize="sm" color="gray.300">
                      {sub.student.first_name} {sub.student.last_name}
                    </Text>
                  </HStack>
                )}

                <Flex mb={4} gap={3} wrap="wrap">
                  <Badge variant="solid" colorScheme={scoreColor(sub.relevance_score)}>
                    Relevance: {sub.relevance_score?.toFixed(1) ?? 'N/A'}
                  </Badge>
                  <Badge variant="solid" colorScheme={scoreColor(sub.feasibility_score)}>
                    Feasibility: {sub.feasibility_score?.toFixed(1) ?? 'N/A'}
                  </Badge>
                </Flex>

                {/* AI Summary Section */}
                {sub.ai_summary && (
                  <Box
                    w="full"
                    mt={4}
                    mb={4}
                    p={4}
                    bg="rgba(66, 153, 225, 0.05)"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="blue.500"
                    boxShadow="0 0 15px rgba(66, 153, 225, 0.1)"
                  >
                    <HStack alignItems="flex-start" spacing={3} mb={2}>
                      <Icon as={MonitorPlay} size={18} color="blue.300" />
                      <Heading size="sm" color="blue.300" mb={0}>
                        AI Abstract Summary
                      </Heading>
                    </HStack>
                    <Text fontSize="sm" color="gray.300" lineHeight="tall">
                      {sub.ai_summary}
                    </Text>
                  </Box>
                )}

                {/* AI Similarity Feedback - Logic Fixed */}
                {sub.ai_similarity_report && sub.ai_similarity_report.title ? (
                  <Box
                    w="full"
                    mt={4}
                    mb={4}
                    p={4}
                    bg="rgba(255, 165, 0, 0.05)"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="orange.500"
                    boxShadow="0 0 15px rgba(237, 137, 54, 0.1)"
                  >
                    <HStack alignItems="flex-start" spacing={3}>
                      <Icon as={AlertTriangle} size={18} color="#ED8936" />
                      <Heading size="sm" color="orange.300" mb={0}>
                        AI Feedback: High Similarity
                      </Heading>
                    </HStack>

                    <Text fontSize="sm" color="gray.300" mb={3} mt={2}>
                      Similar to:
                      <Text as="span" fontWeight="bold" ml={1} color="white">
                        "{sub.ai_similarity_report.title}"
                      </Text>
                    </Text>

                    {sub.ai_suggested_features && (
                      <>
                        <Text fontSize="xs" fontWeight="bold" color="orange.300" mb={1} textTransform="uppercase" letterSpacing="wide">
                          Suggestions for Uniqueness
                        </Text>
                        <Text fontSize="sm" color="gray.400" whiteSpace="pre-wrap">
                          {sub.ai_suggested_features}
                        </Text>
                      </>
                    )}
                  </Box>
                ) : (
                  // If NO similarity but HAS suggestions, show them as neutral/positive suggestions
                  sub.ai_suggested_features && (
                    <Box
                      w="full"
                      mt={4}
                      mb={4}
                      p={4}
                      bg="rgba(72, 187, 120, 0.05)"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="green.500"
                      boxShadow="0 0 15px rgba(72, 187, 120, 0.1)"
                    >
                      <HStack alignItems="flex-start" spacing={3} mb={2}>
                        <Icon as={TrendingUp} size={18} color="green.300" />
                        <Heading size="sm" color="green.300" mb={0}>
                          AI Suggestions for Improvement
                        </Heading>
                      </HStack>
                      <Text fontSize="sm" color="gray.300" whiteSpace="pre-wrap">
                        {sub.ai_suggested_features}
                      </Text>
                    </Box>
                  )
                )}

                {sub.tags && sub.tags.length > 0 && (
                  <Box mt={3} py={2} mb={4}>
                    <HStack spacing={2} wrap="wrap">
                      <Text fontSize="sm" fontWeight="bold" color="cyan.200">AI Keywords:</Text>
                      {sub.tags.map((tag, idx) => (
                        <Tag key={idx} size="sm" colorScheme="cyan" variant="solid" borderRadius="full">
                          {tag}
                        </Tag>
                      ))}
                    </HStack>
                  </Box>
                )}

                <HStack spacing={4}>
                  <Button
                    flex={1}
                    colorScheme="green"
                    variant="solid"
                    leftIcon={<Icon as={CheckCircle} />}
                    onClick={() => handleReview(sub.id, 'Approved')}
                    _hover={{ transform: 'translateY(-2px)', boxShadow: '0 5px 15px rgba(72, 187, 120, 0.4)' }}
                  >
                    Approve
                  </Button>
                  <Button
                    flex={1}
                    colorScheme="red"
                    variant="solid"
                    leftIcon={<Icon as={XCircle} />}
                    onClick={() => handleReview(sub.id, 'Rejected')}
                    _hover={{ transform: 'translateY(-2px)', boxShadow: '0 5px 15px rgba(245, 101, 101, 0.4)' }}
                  >
                    Reject
                  </Button>
                  {sub.project_id && (
                    <Button
                      onClick={() => openMessageModal(sub.project_id!)}
                      leftIcon={<Icon as={MessageSquare} size={16} />}
                      colorScheme="blue"
                      variant="outline"
                      _hover={{ bg: 'blue.500', color: 'white' }}
                    >
                      Messages
                    </Button>
                  )}
                </HStack>
              </MotionBox>
            ))}
          </AnimatePresence>
        </VStack>
      )}
    </VStack>
  );

  const UnappointedView = () => (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">Other Group Projects (Unappointed)</Heading>
        <Badge colorScheme="purple" p={2} borderRadius="md">{unappointedSubmissions.length} Projects</Badge>
      </Flex>

      {loading ? (
        <Flex justify="center" p={10}><Spinner /></Flex>
      ) : unappointedSubmissions.length === 0 ? (
        <Flex direction="column" align="center" justify="center" h="300px" bg="whiteAlpha.50" borderRadius="xl">
          <Icon as={CheckCircle} size={48} color="gray.500" mb={4} />
          <Text color="gray.400">No unappointed projects found.</Text>
        </Flex>
      ) : (
        <VStack spacing={4} align="stretch">
          <AnimatePresence>
            {unappointedSubmissions.map((sub) => (
              <MotionBox
                key={sub.id}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                transition={{ duration: 0.3 }}
                p={6}
                borderRadius="xl"
                bg="rgba(255, 255, 255, 0.03)"
                border="1px solid rgba(255, 255, 255, 0.05)"
                backdropFilter="blur(5px)"
                whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <HStack justify="space-between" mb={4}>
                  <Badge colorScheme="yellow">Submitted</Badge>
                  <Text fontSize="xs" color="gray.500">{new Date(sub.created_at || Date.now()).toLocaleDateString()}</Text>
                </HStack>
                <Heading size="md" mb={2}>{sub.title}</Heading>
                <Text fontSize="sm" color="gray.400" mb={4} noOfLines={3}>{sub.abstract_text}</Text>

                {sub.student && (
                  <HStack mb={4}>
                    <Avatar size="xs" name={sub.student.username} />
                    <Text fontSize="sm" color="gray.300">
                      {sub.student.first_name} {sub.student.last_name}
                    </Text>
                  </HStack>
                )}

                <Flex mb={4} gap={3} wrap="wrap">
                  <Badge variant="solid" colorScheme={scoreColor(sub.relevance_score)}>
                    Relevance: {sub.relevance_score?.toFixed(1) ?? 'N/A'}
                  </Badge>
                  <Badge variant="solid" colorScheme={scoreColor(sub.feasibility_score)}>
                    Feasibility: {sub.feasibility_score?.toFixed(1) ?? 'N/A'}
                  </Badge>
                </Flex>

                <HStack spacing={4}>
                  <Button
                    flex={1}
                    colorScheme="green"
                    variant="solid"
                    leftIcon={<Icon as={CheckCircle} />}
                    onClick={() => handleReview(sub.id, 'Approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    flex={1}
                    colorScheme="red"
                    variant="solid"
                    leftIcon={<Icon as={XCircle} />}
                    onClick={() => handleReview(sub.id, 'Rejected')}
                  >
                    Reject
                  </Button>
                </HStack>
              </MotionBox>
            ))}
          </AnimatePresence>
        </VStack>
      )}
    </VStack>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'overview': return OverviewView();
      case 'approvals': return ApprovalsView();
      case 'unappointed': return UnappointedView();
      case 'assignments': return <TeacherAssignmentManager />;
      case 'monitoring': return <TeacherApprovedProjects />;
      case 'profile': return <TeacherProfile />;
      default: return OverviewView();
    }
  };

  return (
    <Flex minH="100vh" bg="gray.900" color="white" overflowX="hidden">
      {/* Sidebar / Navigation Rail */}
      <Box
        w="280px"
        bg="rgba(0, 0, 0, 0.3)"
        borderRight="1px solid rgba(255, 255, 255, 0.05)"
        p={6}
        display={{ base: 'none', lg: 'block' }}
        position="fixed"
        h="100vh"
        backdropFilter="blur(10px)"
      >
        <VStack spacing={8} align="start" h="full">
          <Heading size="lg" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
            Teacher Portal
          </Heading>

          <VStack spacing={2} w="full" align="stretch">
            <Button
              variant={activeView === 'overview' ? 'solid' : 'ghost'}
              colorScheme={activeView === 'overview' ? 'cyan' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<LayoutDashboard size={20} />}
              onClick={() => setActiveView('overview')}
            >
              Overview
            </Button>
            <Button
              variant={activeView === 'approvals' ? 'solid' : 'ghost'}
              colorScheme={activeView === 'approvals' ? 'cyan' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<CheckSquare size={20} />}
              onClick={() => setActiveView('approvals')}
            >
              Approvals
            </Button>
            <Button
              variant={activeView === 'unappointed' ? 'solid' : 'ghost'}
              colorScheme={activeView === 'unappointed' ? 'cyan' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<CheckSquare size={20} />}
              onClick={() => setActiveView('unappointed')}
            >
              Other Projects
            </Button>
            <Button
              variant={activeView === 'assignments' ? 'solid' : 'ghost'}
              colorScheme={activeView === 'assignments' ? 'cyan' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<BookOpen size={20} />}
              onClick={() => setActiveView('assignments')}
            >
              Assignments
            </Button>
            <Button
              variant={activeView === 'monitoring' ? 'solid' : 'ghost'}
              colorScheme={activeView === 'monitoring' ? 'cyan' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<MonitorPlay size={20} />}
              onClick={() => setActiveView('monitoring')}
            >
              Monitoring
            </Button>
            <Button
              variant={activeView === 'profile' ? 'solid' : 'ghost'}
              colorScheme={activeView === 'profile' ? 'cyan' : 'gray'}
              justifyContent="flex-start"
              leftIcon={<User size={20} />}
              onClick={() => setActiveView('profile')}
            >
              Profile
            </Button>
          </VStack>

          <Spacer />

          <VStack spacing={4} w="full">
            <Divider borderColor="whiteAlpha.200" />
            <Button
              variant="ghost"
              colorScheme="gray"
              justifyContent="flex-start"
              w="full"
              leftIcon={<Icon as={Settings} size={20} />}
              onClick={() => navigate('/settings')}
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              colorScheme="gray"
              justifyContent="flex-start"
              w="full"
              leftIcon={<Icon as={BookOpen} size={20} />}
              onClick={() => navigate('/help')}
            >
              Help & Support
            </Button>
            <Button
              variant="outline"
              colorScheme="red"
              w="full"
              leftIcon={<LogOut size={20} />}
              onClick={() => {
                localStorage.clear();
                navigate('/');
              }}
            >
              Logout
            </Button>
          </VStack>
        </VStack>
      </Box>

      {/* Mobile Header & Drawer Trigger */}
      <Box display={{ base: 'block', lg: 'none' }} position="fixed" top={0} left={0} right={0} zIndex={100} bg="gray.900" borderBottom="1px solid rgba(255,255,255,0.1)" p={4}>
        <Flex justify="space-between" align="center">
          <IconButton
            aria-label="Open Menu"
            icon={<Icon as={LayoutDashboard} />}
            variant="ghost"
            color="white"
            onClick={onOpen}
          />
          <Heading size="md" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">Teacher Portal</Heading>
          <NotificationBell />
        </Flex>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay backdropFilter="blur(5px)" />
        <DrawerContent bg="gray.900" borderRight="1px solid rgba(255,255,255,0.1)">
          <DrawerCloseButton color="white" />
          <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.100">
            <Heading size="md" color="white">Menu</Heading>
          </DrawerHeader>
          <DrawerBody p={4}>
            <VStack spacing={2} align="stretch">
              <Button variant={activeView === 'overview' ? 'solid' : 'ghost'} colorScheme={activeView === 'overview' ? 'cyan' : 'gray'} justifyContent="flex-start" leftIcon={<LayoutDashboard size={20} />} onClick={() => { setActiveView('overview'); onClose(); }}>Overview</Button>
              <Button variant={activeView === 'approvals' ? 'solid' : 'ghost'} colorScheme={activeView === 'approvals' ? 'cyan' : 'gray'} justifyContent="flex-start" leftIcon={<CheckSquare size={20} />} onClick={() => { setActiveView('approvals'); onClose(); }}>Approvals</Button>
              <Button variant={activeView === 'unappointed' ? 'solid' : 'ghost'} colorScheme={activeView === 'unappointed' ? 'cyan' : 'gray'} justifyContent="flex-start" leftIcon={<CheckSquare size={20} />} onClick={() => { setActiveView('unappointed'); onClose(); }}>Other Projects</Button>
              <Button variant={activeView === 'assignments' ? 'solid' : 'ghost'} colorScheme={activeView === 'assignments' ? 'cyan' : 'gray'} justifyContent="flex-start" leftIcon={<BookOpen size={20} />} onClick={() => { setActiveView('assignments'); onClose(); }}>Assignments</Button>
              <Button variant={activeView === 'monitoring' ? 'solid' : 'ghost'} colorScheme={activeView === 'monitoring' ? 'cyan' : 'gray'} justifyContent="flex-start" leftIcon={<MonitorPlay size={20} />} onClick={() => { setActiveView('monitoring'); onClose(); }}>Monitoring</Button>
              <Button variant={activeView === 'profile' ? 'solid' : 'ghost'} colorScheme={activeView === 'profile' ? 'cyan' : 'gray'} justifyContent="flex-start" leftIcon={<User size={20} />} onClick={() => { setActiveView('profile'); onClose(); }}>Profile</Button>

              <Divider my={4} borderColor="whiteAlpha.200" />

              <Button variant="ghost" colorScheme="gray" justifyContent="flex-start" leftIcon={<Icon as={Settings} size={20} />} onClick={() => { navigate('/settings'); onClose(); }}>Settings</Button>
              <Button variant="ghost" colorScheme="gray" justifyContent="flex-start" leftIcon={<Icon as={BookOpen} size={20} />} onClick={() => { navigate('/help'); onClose(); }}>Help & Support</Button>
              <Button variant="outline" colorScheme="red" mt={4} leftIcon={<LogOut size={20} />} onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content Area */}
      <Box
        flex="1"
        ml={{ base: 0, lg: '280px' }}
        p={{ base: 4, lg: 8 }}
        pt={{ base: 20, lg: 8 }} // Add padding top for mobile header
        transition="all 0.3s"
      >
        {/* Desktop Header Actions */}
        <Flex justify="flex-end" mb={6} display={{ base: 'none', lg: 'flex' }}>
          <HStack spacing={4}>
            <NotificationBell />
            <Avatar size="sm" name="Professor" bg="cyan.500" cursor="pointer" onClick={() => setActiveView('profile')} />
          </HStack>
        </Flex>

        <AnimatePresence mode="wait">
          <MotionBox
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </MotionBox>
        </AnimatePresence>
      </Box>

      {/* Message Modal */}
      <Modal isOpen={isMsgOpen} onClose={onMsgClose} size="lg">
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Project Messages</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch" maxH="400px" overflowY="auto" mb={4}>
              {loadingMessages ? (
                <Spinner />
              ) : msgError ? (
                <Alert status="error">
                  <AlertIcon />
                  {msgError}
                </Alert>
              ) : messages.length === 0 ? (
                <Text color="gray.500">No messages yet.</Text>
              ) : (
                messages.map((msg) => (
                  <Box key={msg.id} p={3} bg="whiteAlpha.100" borderRadius="md">
                    <Text fontWeight="bold" fontSize="sm">{msg.sender_username}</Text>
                    <Text fontSize="md">{msg.content}</Text>
                    <Text fontSize="xs" color="gray.500">{new Date(msg.timestamp).toLocaleString()}</Text>
                  </Box>
                ))
              )}
            </VStack>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onMsgClose}>Close</Button>
            <Button colorScheme="blue" onClick={handleSendMessage} isLoading={sendingMessage}>Send</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Flex>
  );
};

export default TeacherDashboard;
