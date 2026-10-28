import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class RepositoryRecord(Base):
    __tablename__ = "repositories"

    id = Column(String(120), primary_key=True, index=True)  # owner__repo
    owner = Column(String(100), nullable=False)
    name = Column(String(100), nullable=False)
    url = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_branch = Column(String(50), default="main")
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    license = Column(String(100), nullable=True)
    primary_languages = Column(Text, default="[]")  # JSON string
    frameworks = Column(Text, default="[]")  # JSON string
    total_files_discovered = Column(Integer, default=0)
    files_indexed_count = Column(Integer, default=0)
    total_size_bytes = Column(Integer, default=0)
    readme_summary = Column(Text, nullable=True)
    important_files = Column(Text, default="[]")  # JSON string
    risk_areas = Column(Text, default="[]")  # JSON string
    status = Column(String(50), default="ready")
    analyzed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    files = relationship("IndexedFileRecord", back_populates="repository", cascade="all, delete-orphan")
    questions = relationship("QuestionRecord", back_populates="repository", cascade="all, delete-orphan")


class IndexedFileRecord(Base):
    __tablename__ = "indexed_files"

    id = Column(String(150), primary_key=True)  # repo_id__path_hash
    repository_id = Column(String(120), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String(500), nullable=False, index=True)
    size = Column(Integer, default=0)
    language = Column(String(50), default="text")
    lines_count = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    symbols = Column(Text, default="[]")  # JSON string: AST classes, functions, imports

    repository = relationship("RepositoryRecord", back_populates="files")

    __table_args__ = (
        Index("idx_repo_path", "repository_id", "path"),
    )


class QuestionRecord(Base):
    __tablename__ = "questions"

    id = Column(String(64), primary_key=True)
    repository_id = Column(String(120), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    referenced_files = Column(Text, default="[]")  # JSON list
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    repository = relationship("RepositoryRecord", back_populates="questions")
