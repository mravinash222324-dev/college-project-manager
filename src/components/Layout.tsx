import React from 'react';
import type { ReactNode } from 'react';
import {
    Box,
    Flex,
    IconButton,
    useDisclosure,
    VStack,
    HStack,
    Text,
    Avatar,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider,
    Tooltip,
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Lucide from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

const {
    Menu: MenuIcon,
    X,
    LayoutDashboard,
    CheckSquare,
    LogOut,
    User,
    Settings,
    Bell,
} = Lucide;

const MotionBox = motion(Box);

interface LayoutProps {
    children: ReactNode;
    userRole: 'Student' | 'Teacher' | 'Admin';
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => {
    return (
        <Tooltip label={collapsed ? label : ''} placement="right" hasArrow bg="gray.700" color="white">
            <HStack
                as="button"
                onClick={onClick}
                w="full"
                py={3}
                px={collapsed ? 2 : 4}
                justify={collapsed ? 'center' : 'flex-start'}
                borderRadius="xl"
                transition="all 0.2s"
                bg={active ? 'blue.500' : 'transparent'}
                color={active ? 'white' : 'gray.400'}
                _hover={{ bg: active ? 'blue.600' : 'whiteAlpha.100', color: active ? 'white' : 'gray.200', transform: 'translateX(2px)' }}
            >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {!collapsed && (
                    <Text fontWeight={active ? '600' : '500'} fontSize="md">
                        {label}
                    </Text>
                )}
                {active && !collapsed && (
                    <Box ml="auto" w="6px" h="6px" borderRadius="full" bg="white" />
                )}
            </HStack>
        </Tooltip>
    );
};

const Layout: React.FC<LayoutProps> = ({ children, userRole }) => {
    const { onOpen } = useDisclosure();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = React.useState(false);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: userRole === 'Teacher' ? '/teacher-dashboard' : '/student-dashboard' },
        { icon: CheckSquare, label: 'Projects', path: userRole === 'Teacher' ? '/teacher/approved-projects' : '/student/my-projects' },
        ...(userRole === 'Student' ? [{ icon: Lucide.Zap, label: 'Pre-Submission Check', path: '/student/self-check' }] : []),
    ];

    return (
        <Flex minH="100vh" position="relative" overflow="hidden">
            {/* Animated Background Mesh */}
            <Box className="animated-bg" />

            {/* --- Sidebar (Floating) --- */}
            <MotionBox
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                display={{ base: 'none', md: 'flex' }}
                flexDir="column"
                w={collapsed ? '80px' : '260px'}
                h="calc(100vh - 32px)"
                m={4}
                p={4}
                className="glass-card"
                position="sticky"
                top={4}
                zIndex={10}
                bg="rgba(15, 23, 42, 0.6)"
                border="1px solid rgba(255, 255, 255, 0.08)"
            >
                {/* Logo Area */}
                <Flex align="center" justify={collapsed ? 'center' : 'space-between'} mb={8} px={2}>
                    {!collapsed && (
                        <HStack spacing={3}>
                            <Box p={2} bgGradient="linear(to-br, blue.500, purple.600)" borderRadius="lg">
                                <LayoutDashboard color="white" size={20} />
                            </Box>
                            <VStack align="start" spacing={0}>
                                <Text fontSize="lg" fontWeight="800" letterSpacing="tight" lineHeight="1" color="white">
                                    PMS<Text as="span" color="blue.400">.AI</Text>
                                </Text>
                                <Text fontSize="xs" color="gray.400" fontWeight="500">Workspace</Text>
                            </VStack>
                        </HStack>
                    )}
                    {collapsed && (
                        <Box p={2} bgGradient="linear(to-br, blue.500, purple.600)" borderRadius="lg">
                            <LayoutDashboard color="white" size={20} />
                        </Box>
                    )}
                    <IconButton
                        aria-label="Toggle Sidebar"
                        icon={collapsed ? <MenuIcon size={18} /> : <X size={18} />}
                        size="xs"
                        variant="ghost"
                        onClick={() => setCollapsed(!collapsed)}
                        display={collapsed ? 'none' : 'flex'}
                        color="gray.400"
                        _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
                    />
                </Flex>

                {/* Navigation Items */}
                <VStack spacing={2} align="stretch" flex={1}>
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            path={item.path}
                            active={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                            collapsed={collapsed}
                        />
                    ))}
                </VStack>

                {/* User Profile & Logout */}
                <Box pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
                    <Menu placement="right-end">
                        <MenuButton w="full">
                            <HStack justify={collapsed ? 'center' : 'flex-start'} spacing={3} p={2} borderRadius="xl" _hover={{ bg: 'whiteAlpha.100' }}>
                                <Avatar size="sm" name={userRole} bgGradient="linear(to-r, blue.400, purple.500)" />
                                {!collapsed && (
                                    <VStack align="start" spacing={0} overflow="hidden">
                                        <Text fontSize="sm" fontWeight="600" color="gray.200" isTruncated>
                                            {localStorage.getItem('fullName') || userRole}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">{userRole}</Text>
                                    </VStack>
                                )}
                            </HStack>
                        </MenuButton>
                        <MenuList className="glass-card" border="1px solid rgba(255,255,255,0.1)" boxShadow="xl" bg="#1e293b">
                            <MenuItem icon={<User size={16} />} bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} onClick={() => navigate('/student/profile')}>Profile</MenuItem>
                            <MenuItem icon={<Settings size={16} />} bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} onClick={() => navigate('/settings')}>Settings</MenuItem>
                            <MenuDivider borderColor="whiteAlpha.200" />
                            <MenuItem icon={<LogOut size={16} />} color="red.400" bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} onClick={handleLogout}>
                                Logout
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </Box>
            </MotionBox>

            {/* --- Main Content Area --- */}
            <Box flex={1} position="relative" h="100vh" overflowY="auto" overflowX="hidden">
                {/* Top Navbar (Mobile Only / Search Bar) */}
                <Flex
                    px={8}
                    py={4}
                    justify="space-between"
                    align="center"
                    position="sticky"
                    top={0}
                    zIndex={5}
                    bg="transparent"
                >
                    <Box display={{ base: 'block', md: 'none' }}>
                        <IconButton icon={<MenuIcon />} aria-label="Menu" onClick={onOpen} variant="ghost" color="white" />
                    </Box>


                    <HStack spacing={4}>
                        <IconButton
                            aria-label="Notifications"
                            icon={<Bell size={20} />}
                            variant="ghost"
                            borderRadius="full"
                            color="gray.400"
                            _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
                        />
                    </HStack>
                </Flex>

                {/* Page Content with Transition */}
                <Box px={{ base: 4, md: 8 }} pb={8}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </Box>
        </Flex>
    );
};

export default Layout;
