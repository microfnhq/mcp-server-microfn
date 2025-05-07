from setuptools import setup, find_packages

setup(
    name="mcp-server-microfn",
    version="0.1.0",
    description="MCP Server for microfn",
    author="David Mohl",
    author_email="git@d.sh",
    packages=find_packages(include=["tools"]),
    py_modules=["server", "config", "api_client"],
    install_requires=[
        "fastmcp>=0.2.0",
        "httpx",
        "pydantic-settings",
    ],
    entry_points={
        "console_scripts": [
            "server=server:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
