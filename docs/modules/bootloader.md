
# Bootloader Module

The Lonx OS bootloader is responsible for initializing the system and loading the kernel. This document provides an overview of the boot process and the TylonV boot flow.

## Boot Process

The boot process begins when the system is powered on. The bootloader performs the following steps:

1.  **Hardware Initialization**: The bootloader initializes the necessary hardware components, such as the CPU, memory, and storage devices.
2.  **Kernel Loading**: The bootloader loads the Lonx OS kernel into memory from the boot device.
3.  **Kernel Execution**: The bootloader transfers control to the kernel, which then takes over the system.

## TylonV Boot Flow

TylonV is the bootloader used by Lonx OS. It follows a specific boot flow to load the operating system:

1.  **TylonV Initialization**: TylonV is loaded into memory and initializes itself.
2.  **Configuration Loading**: TylonV loads the bootloader configuration file, which contains information about the kernel and other boot parameters.
3.  **Kernel Loading**: TylonV loads the Lonx OS kernel and any required modules into memory.
4.  **Kernel Execution**: TylonV transfers control to the Lonx OS kernel, which begins the system initialization process.

## Customization

The bootloader can be customized to meet specific requirements. For example, you can modify the bootloader configuration to:

*   Change the default kernel to be loaded.
*   Add or remove kernel modules.
*   Specify custom boot parameters.

For more information on customizing the bootloader, refer to the TylonV documentation.
