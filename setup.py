from setuptools import setup, find_packages

setup(
    name="local-agent-forge",
    version="1.0.0",
    description="Zero-cloud local GPU orchestrator, dynamic model router, and MCP server for agentic workflows with real-time token savings tracking.",
    long_description=open("README.md", "r", encoding="utf-8").read() if __import__("os").path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    author="Nymrel",
    author_email="contact@nymrel.com",
    license="MIT",
    url="https://github.com/nymrel/local-agent-forge",
    package_dir={"": "python"},
    packages=find_packages(where="python"),
    python_requires=">=3.9",
    entry_points={
        "console_scripts": [
            "local-forge-py=local_agent_forge.cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
    ],
)
