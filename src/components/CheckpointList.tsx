// frontend/src/components/CheckpointList.tsx
import React, { useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Badge,
    Button,
    Icon,
    Collapse,
    Textarea,
    useToast,
    Flex,
    Circle,
} from '@chakra-ui/react';
import * as Lucide from "lucide-react";
import axios from 'axios';

const { CheckCircle, Lock, ChevronDown, ChevronUp, UploadCloud, PlayCircle } = Lucide;

interface Checkpoint {
    id: number;
    title: string;
    description: string;
    deadline: string | null;
    is_completed: boolean;
    date_completed: string | null;
}

interface CheckpointListProps {
    checkpoints: Checkpoint[];
    projectId: number;
    isTeacher?: boolean;
    onUpdate?: () => void; // Callback to refresh data
}

const CheckpointList: React.FC<CheckpointListProps> = ({ checkpoints, projectId, isTeacher = false, onUpdate }) => {
    const [verifyingId, setVerifyingId] = useState<number | null>(null);
    const [proofText, setProofText] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const toast = useToast();

    const handleVerify = async (checkpointId: number) => {
        if (!proofText.trim()) {
            toast({ title: "Proof required", status: "warning" });
            return;
        }

        setVerifyingId(checkpointId);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(
                `http://127.0.0.1:8000/projects/${projectId}/checkpoints/${checkpointId}/verify/`,
                { proof_text: proofText },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.is_approved) {
                toast({
                    title: "Checkpoint Completed! 🎉",
                    description: response.data.feedback,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
                setProofText('');
                setExpandedId(null);
                if (onUpdate) onUpdate();
            } else {
                toast({
                    title: "Verification Failed",
                    description: response.data.feedback,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            toast({ title: "Error verifying checkpoint", status: "error" });
        } finally {
            setVerifyingId(null);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <VStack spacing={0} align="stretch" position="relative">
            {/* Vertical Line */}
            <Box
                position="absolute"
                left="20px"
                top="20px"
                bottom="20px"
                width="2px"
                bg="rgba(255,255,255,0.1)"
                zIndex={0}
            />

            {checkpoints.map((cp, index) => {
                const isNext = !cp.is_completed && (index === 0 || checkpoints[index - 1].is_completed);
                const isLocked = !cp.is_completed && !isNext;

                return (
                    <Box key={cp.id} pb={8} position="relative" zIndex={1}>
                        <HStack align="start" spacing={4}>
                            {/* Status Icon */}
                            <Circle
                                size="40px"
                                bg={cp.is_completed ? 'green.500' : isNext ? 'cyan.500' : 'gray.700'}
                                color="white"
                                boxShadow={isNext ? '0 0 15px cyan' : 'none'}
                                border="2px solid"
                                borderColor={cp.is_completed ? 'green.300' : isNext ? 'cyan.300' : 'gray.600'}
                            >
                                {cp.is_completed ? <CheckCircle size={20} /> : isLocked ? <Lock size={18} /> : <PlayCircle size={20} />}
                            </Circle>

                            {/* Content Card */}
                            <Box
                                flex="1"
                                bg={cp.is_completed ? 'rgba(0, 255, 0, 0.05)' : isNext ? 'rgba(0, 255, 255, 0.05)' : 'rgba(255,255,255,0.02)'}
                                border="1px solid"
                                borderColor={cp.is_completed ? 'green.500' : isNext ? 'cyan.500' : 'rgba(255,255,255,0.1)'}
                                borderRadius="lg"
                                p={4}
                                transition="all 0.3s"
                                _hover={{ borderColor: isNext ? 'cyan.300' : 'rgba(255,255,255,0.2)' }}
                            >
                                <Flex justify="space-between" align="center" cursor={!isLocked ? "pointer" : "default"} onClick={() => !isLocked && toggleExpand(cp.id)}>
                                    <VStack align="start" spacing={1}>
                                        <HStack>
                                            <Text fontWeight="bold" fontSize="lg" color={cp.is_completed ? 'green.300' : isNext ? 'cyan.300' : 'gray.400'}>
                                                {cp.title}
                                            </Text>
                                            {cp.is_completed && <Badge colorScheme="green">Completed</Badge>}
                                            {isNext && <Badge colorScheme="cyan" variant="solid">Current Goal</Badge>}
                                        </HStack>
                                        <Text fontSize="sm" color="gray.400" noOfLines={expandedId === cp.id ? undefined : 1}>
                                            {cp.description}
                                        </Text>
                                    </VStack>
                                    {!isLocked && (
                                        <Icon as={expandedId === cp.id ? ChevronUp : ChevronDown} color="gray.500" />
                                    )}
                                </Flex>

                                {/* Expanded Content (Proof Submission) */}
                                <Collapse in={expandedId === cp.id} animateOpacity>
                                    <Box mt={4} pt={4} borderTop="1px solid" borderColor="rgba(255,255,255,0.1)">
                                        {cp.is_completed ? (
                                            <Box>
                                                <Text fontSize="sm" color="green.300" fontWeight="bold" mb={1}>
                                                    Completed on {new Date(cp.date_completed!).toLocaleDateString()}
                                                </Text>
                                                <Text fontSize="sm" color="gray.400">
                                                    Great job! This milestone is verified.
                                                </Text>
                                            </Box>
                                        ) : isTeacher ? (
                                            <Text fontSize="sm" color="gray.400" fontStyle="italic">
                                                Waiting for student submission...
                                            </Text>
                                        ) : (
                                            <VStack align="stretch" spacing={3}>
                                                <Text fontSize="sm" color="cyan.200">
                                                    Submit Proof to Unlock (Code snippet, GitHub link, or explanation):
                                                </Text>
                                                <Textarea
                                                    value={proofText}
                                                    onChange={(e) => setProofText(e.target.value)}
                                                    placeholder="I have implemented the login API using JWT..."
                                                    bg="rgba(0,0,0,0.3)"
                                                    borderColor="gray.600"
                                                    _focus={{ borderColor: 'cyan.400' }}
                                                    rows={3}
                                                />
                                                <Button
                                                    size="sm"
                                                    colorScheme="cyan"
                                                    leftIcon={<UploadCloud size={16} />}
                                                    onClick={() => handleVerify(cp.id)}
                                                    isLoading={verifyingId === cp.id}
                                                    loadingText="AI Verifying..."
                                                >
                                                    Submit Proof
                                                </Button>
                                            </VStack>
                                        )}
                                    </Box>
                                </Collapse>
                            </Box>
                        </HStack>
                    </Box>
                );
            })}
        </VStack>
    );
};

export default CheckpointList;
