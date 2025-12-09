import React, { useState } from 'react';
import {
    Box,
    Heading,
    Text,
    VStack,
    FormControl,
    FormLabel,
    Input,
    Button,
    Switch,
    Divider,
    useToast,
    Container,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { Settings as SettingsIcon, Shield, User, Bell, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const Settings: React.FC = () => {
    const toast = useToast();
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(true);

    const handleSave = () => {
        toast({
            title: 'Settings Saved',
            description: "Your preferences have been updated successfully.",
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
    };

    return (
        <Container maxW="container.md" py={10}>
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                p={8}
                bg="rgba(255, 255, 255, 0.03)"
                backdropFilter="blur(10px)"
                borderRadius="2xl"
                border="1px solid rgba(255, 255, 255, 0.05)"
            >
                <HStack mb={8} spacing={4}>
                    <Box p={3} bg="cyan.900" borderRadius="xl">
                        <Icon as={SettingsIcon} w={8} h={8} color="cyan.400" />
                    </Box>
                    <Box>
                        <Heading size="xl" color="white">Settings</Heading>
                        <Text color="gray.400">Manage your account preferences</Text>
                    </Box>
                </HStack>

                <VStack spacing={8} align="stretch">
                    {/* Profile Section */}
                    <Box>
                        <HStack mb={4}>
                            <Icon as={User} color="blue.400" />
                            <Heading size="md" color="gray.200">Profile Information</Heading>
                        </HStack>
                        <VStack spacing={4}>
                            <FormControl>
                                <FormLabel color="gray.400">Display Name</FormLabel>
                                <Input
                                    defaultValue="John Doe"
                                    bg="rgba(0,0,0,0.2)"
                                    border="1px solid rgba(255,255,255,0.1)"
                                    color="white"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel color="gray.400">Email Address</FormLabel>
                                <Input
                                    defaultValue="john.doe@example.com"
                                    isReadOnly
                                    bg="rgba(0,0,0,0.2)"
                                    border="1px solid rgba(255,255,255,0.1)"
                                    color="gray.500"
                                />
                            </FormControl>
                        </VStack>
                    </Box>

                    <Divider borderColor="whiteAlpha.200" />

                    {/* Security Section */}
                    <Box>
                        <HStack mb={4}>
                            <Icon as={Shield} color="green.400" />
                            <Heading size="md" color="gray.200">Security</Heading>
                        </HStack>
                        <Button variant="outline" colorScheme="red" size="sm">
                            Change Password
                        </Button>
                    </Box>

                    <Divider borderColor="whiteAlpha.200" />

                    {/* Preferences Section */}
                    <Box>
                        <HStack mb={4}>
                            <Icon as={Bell} color="yellow.400" />
                            <Heading size="md" color="gray.200">Preferences</Heading>
                        </HStack>
                        <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                                <Text color="gray.300">Email Notifications</Text>
                                <Switch
                                    isChecked={emailNotifications}
                                    onChange={(e) => setEmailNotifications(e.target.checked)}
                                    colorScheme="cyan"
                                />
                            </HStack>
                            <HStack justify="space-between">
                                <HStack>
                                    <Icon as={Moon} size={16} color="purple.400" />
                                    <Text color="gray.300">Dark Mode</Text>
                                </HStack>
                                <Switch
                                    isChecked={darkMode}
                                    onChange={(e) => setDarkMode(e.target.checked)}
                                    colorScheme="purple"
                                />
                            </HStack>
                        </VStack>
                    </Box>

                    <Button
                        colorScheme="cyan"
                        size="lg"
                        onClick={handleSave}
                        mt={4}
                        _hover={{ transform: 'translateY(-2px)', boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)' }}
                    >
                        Save Changes
                    </Button>
                </VStack>
            </MotionBox>
        </Container>
    );
};

export default Settings;
