/**
 * @fileoverview Learning and Development Controller
 * 
 * This controller provides learning and development endpoints for the CRM BenchSales AI Integration application.
 * It handles training programs, skill assessments, and career development capabilities.
 * 
 * Key features:
 * - Training program management
 * - Skill assessment and tracking
 * - Career development planning
 * - Learning path recommendations
 * - Certification management
 * - Role-based access control for different user types
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { LearningDevelopmentService } from "./learning-development.service";

/**
 * Controller for learning and development functionality.
 * 
 * This controller provides endpoints for managing training programs,
 * skill assessments, and career development with comprehensive
 * learning path recommendations and certification tracking.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create training program
 * POST /tenants/{tenantId}/learning/programs
 * {
 *   "title": "Advanced React Development",
 *   "description": "Comprehensive React training program",
 *   "duration": "40 hours"
 * }
 * 
 * // Enroll employee in training
 * POST /tenants/{tenantId}/learning/enrollments
 * {
 *   "employeeId": "emp-123",
 *   "programId": "prog-456"
 * }
 * ```
 */
@Controller("tenants/:tenantId/learning")
export class LearningDevelopmentController {
  /**
   * Initializes the learning and development controller with the service dependency.
   * 
   * @param service - The learning and development service for business logic
   */
  constructor(private readonly service: LearningDevelopmentService) {}

  /**
   * Creates a new training program.
   * 
   * This endpoint creates a comprehensive training program with
   * modules, assessments, and certification requirements.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing program details
   * @param body.title - Program title
   * @param body.description - Program description
   * @param body.duration - Program duration in hours
   * @param body.category - Training category (technical, soft-skills, compliance)
   * @param body.difficulty - Difficulty level (beginner, intermediate, advanced)
   * @param body.modules - Array of training modules
   * @param body.certification - Certification details
   * @returns Object containing program details and status
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "title": "Advanced React Development",
   *   "description": "Comprehensive React training program covering hooks, context, and performance optimization",
   *   "duration": 40,
   *   "category": "technical",
   *   "difficulty": "advanced",
   *   "modules": [
   *     {
   *       "title": "React Hooks Deep Dive",
   *       "duration": 8,
   *       "type": "video"
   *     }
   *   ],
   *   "certification": {
   *     "name": "React Advanced Developer",
   *     "validity": "2 years"
   *   }
   * }
   * 
   * // Response format
   * {
   *   "programId": "prog-789",
   *   "title": "Advanced React Development",
   *   "status": "ACTIVE",
   *   "enrollmentCount": 0,
   *   "completionRate": 0.0,
   *   "createdAt": "2024-01-15T10:00:00Z"
   * }
   * ```
   */
  @Post("programs")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createTrainingProgram(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      title: string; 
      description: string; 
      duration: number; 
      category: string; 
      difficulty: string; 
      modules: Array<{ title: string; duration: number; type: string }>; 
      certification: { name: string; validity: string } 
    }
  ) {
    return this.service.createTrainingProgram(tenantId, body.title, body.description, body.duration, body.category, body.difficulty, body.modules, body.certification);
  }

  /**
   * Retrieves all training programs for the tenant.
   * 
   * This endpoint provides a list of all training programs with their
   * enrollment statistics and completion rates.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.category - Filter by training category
   * @param query.difficulty - Filter by difficulty level
   * @param query.status - Filter by program status
   * @param query.limit - Maximum number of programs to return
   * @param query.offset - Number of programs to skip
   * @returns Array of training programs with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "programId": "prog-789",
   *     "title": "Advanced React Development",
   *     "category": "technical",
   *     "difficulty": "advanced",
   *     "duration": 40,
   *     "enrollmentCount": 25,
   *     "completionRate": 0.85,
   *     "status": "ACTIVE"
   *   }
   * ]
   * ```
   */
  @Get("programs")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getTrainingPrograms(
    @Param("tenantId") tenantId: string,
    @Query("category") category?: string,
    @Query("difficulty") difficulty?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getTrainingPrograms(tenantId, category, difficulty, status, limit, offset);
  }

  /**
   * Enrolls an employee in a training program.
   * 
   * This endpoint enrolls an employee in a training program with
   * automatic progress tracking and completion monitoring.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing enrollment details
   * @param body.employeeId - The employee identifier
   * @param body.programId - The training program identifier
   * @param body.enrolledBy - ID of the person enrolling the employee
   * @param body.targetCompletionDate - Target completion date
   * @param body.notes - Optional enrollment notes
   * @returns Object containing enrollment confirmation and details
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "employeeId": "emp-123",
   *   "programId": "prog-456",
   *   "enrolledBy": "mgr-789",
   *   "targetCompletionDate": "2024-03-15",
   *   "notes": "Required for promotion to Senior Developer"
   * }
   * 
   * // Response format
   * {
   *   "enrollmentId": "enroll-101",
   *   "employeeId": "emp-123",
   *   "programId": "prog-456",
   *   "status": "ENROLLED",
   *   "progress": 0.0,
   *   "enrolledAt": "2024-01-15T10:00:00Z",
   *   "targetCompletionDate": "2024-03-15"
   * }
   * ```
   */
  @Post("enrollments")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  enrollEmployee(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      employeeId: string; 
      programId: string; 
      enrolledBy: string; 
      targetCompletionDate: string; 
      notes?: string 
    }
  ) {
    return this.service.enrollEmployee(tenantId, body.employeeId, body.programId, body.enrolledBy, body.targetCompletionDate, body.notes);
  }

  /**
   * Retrieves all training enrollments for the tenant.
   * 
   * This endpoint provides a list of all training enrollments with their
   * progress, status, and completion information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for filtering and pagination
   * @param query.status - Enrollment status filter
   * @param query.programId - Filter by program ID
   * @param query.employeeId - Filter by employee ID
   * @param query.limit - Maximum number of enrollments to return
   * @param query.offset - Number of enrollments to skip
   * @returns Array of training enrollments with pagination info
   * 
   * @example
   * ```typescript
   * // Response format
   * [
   *   {
   *     "enrollmentId": "enroll-101",
   *     "employeeName": "John Doe",
   *     "programTitle": "Advanced React Development",
   *     "status": "IN_PROGRESS",
   *     "progress": 0.65,
   *     "enrolledAt": "2024-01-15T10:00:00Z",
   *     "targetCompletionDate": "2024-03-15"
   *   }
   * ]
   * ```
   */
  @Get("enrollments")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getTrainingEnrollments(
    @Param("tenantId") tenantId: string,
    @Query("status") status?: string,
    @Query("programId") programId?: string,
    @Query("employeeId") employeeId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.service.getTrainingEnrollments(tenantId, status, programId, employeeId, limit, offset);
  }

  /**
   * Updates training progress for an employee.
   * 
   * This endpoint updates the progress of an employee's training
   * with automatic completion detection and certification issuance.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param enrollmentId - The enrollment identifier
   * @param body - Request body containing progress update details
   * @param body.moduleId - Module identifier for progress update
   * @param body.completed - Whether the module is completed
   * @param body.score - Assessment score if applicable
   * @param body.timeSpent - Time spent on the module
   * @returns Object containing updated progress information
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "moduleId": "mod-1",
   *   "completed": true,
   *   "score": 85,
   *   "timeSpent": 120
   * }
   * 
   * // Response format
   * {
   *   "enrollmentId": "enroll-101",
   *   "moduleId": "mod-1",
   *   "progress": 0.75,
   *   "completedModules": 3,
   *   "totalModules": 4,
   *   "status": "IN_PROGRESS",
   *   "updatedAt": "2024-01-20T14:30:00Z"
   * }
   * ```
   */
  @Put("enrollments/:enrollmentId/progress")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  updateTrainingProgress(
    @Param("tenantId") tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() body: { moduleId: string; completed: boolean; score?: number; timeSpent: number }
  ) {
    return this.service.updateTrainingProgress(tenantId, enrollmentId, body.moduleId, body.completed, body.score, body.timeSpent);
  }

  /**
   * Conducts a skill assessment for an employee.
   * 
   * This endpoint conducts a comprehensive skill assessment with
   * automated scoring and skill gap analysis.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing assessment details
   * @param body.employeeId - The employee identifier
   * @param body.skillCategory - Category of skills being assessed
   * @param body.assessmentType - Type of assessment (technical, soft-skills, behavioral)
   * @param body.questions - Array of assessment questions
   * @param body.answers - Employee's answers to questions
   * @returns Object containing assessment results and recommendations
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "employeeId": "emp-123",
   *   "skillCategory": "programming",
   *   "assessmentType": "technical",
   *   "questions": [
   *     {
   *       "questionId": "q1",
   *       "question": "What is the purpose of React hooks?",
   *       "type": "multiple_choice"
   *     }
   *   ],
   *   "answers": [
   *     {
   *       "questionId": "q1",
   *       "answer": "To manage state and side effects in functional components"
   *     }
   *   ]
   * }
   * 
   * // Response format
   * {
   *   "assessmentId": "assess-456",
   *   "employeeId": "emp-123",
   *   "overallScore": 85,
   *   "skillLevel": "Advanced",
   *   "strengths": ["React", "JavaScript"],
   *   "improvementAreas": ["TypeScript", "Testing"],
   *   "recommendations": [
   *     {
   *       "skill": "TypeScript",
   *       "recommendedTraining": "TypeScript Fundamentals",
   *       "priority": "High"
   *     }
   *   ]
   * }
   * ```
   */
  @Post("assessments")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  conductSkillAssessment(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      employeeId: string; 
      skillCategory: string; 
      assessmentType: string; 
      questions: Array<{ questionId: string; question: string; type: string }>; 
      answers: Array<{ questionId: string; answer: string }> 
    }
  ) {
    return this.service.conductSkillAssessment(tenantId, body.employeeId, body.skillCategory, body.assessmentType, body.questions, body.answers);
  }

  /**
   * Retrieves learning and development analytics.
   * 
   * This endpoint provides comprehensive analytics including
   * training completion rates, skill development trends, and ROI metrics.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param query - Query parameters for analytics
   * @param query.period - Time period for analytics (7d, 30d, 90d, 1y)
   * @param query.category - Filter by training category
   * @param query.includeROI - Whether to include ROI calculations
   * @returns Object containing learning and development analytics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "overview": {
   *     "totalPrograms": 15,
   *     "activeEnrollments": 120,
   *     "completionRate": 0.78,
   *     "avgTrainingHours": 25
   *   },
   *   "byCategory": [
   *     {
   *       "category": "technical",
   *       "programs": 8,
   *       "enrollments": 80,
   *       "completionRate": 0.82
   *     }
   *   ],
   *   "skillGaps": [
   *     {
   *       "skill": "Cloud Computing",
   *       "gapPercentage": 0.65,
   *       "recommendedTraining": "AWS Fundamentals"
   *     }
   *   ],
   *   "roi": {
   *     "trainingInvestment": 50000,
   *     "productivityGain": 75000,
   *     "roi": 1.5
   *   }
   * }
   * ```
   */
  @Get("analytics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  getLearningAnalytics(
    @Param("tenantId") tenantId: string,
    @Query("period") period?: string,
    @Query("category") category?: string,
    @Query("includeROI") includeROI?: string
  ) {
    return this.service.getLearningAnalytics(tenantId, period, category, includeROI);
  }

  /**
   * Generates personalized learning path recommendations.
   * 
   * This endpoint uses AI to analyze employee skills and career goals
   * to recommend personalized learning paths and training programs.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing recommendation parameters
   * @param body.employeeId - The employee identifier
   * @param body.careerGoals - Employee's career goals
   * @param body.currentSkills - Current skill assessment
   * @param body.timeCommitment - Available time for learning
   * @returns Object containing personalized learning recommendations
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "employeeId": "emp-123",
   *   "careerGoals": ["Senior Developer", "Technical Lead"],
   *   "currentSkills": {
   *     "React": "Intermediate",
   *     "Node.js": "Beginner"
   *   },
   *   "timeCommitment": "5 hours per week"
   * }
   * 
   * // Response format
   * {
   *   "recommendationId": "rec-789",
   *   "employeeId": "emp-123",
   *   "learningPath": [
   *     {
   *       "phase": 1,
   *       "title": "Advanced React Development",
   *       "duration": "8 weeks",
   *       "priority": "High"
   *     }
   *   ],
   *   "skillGaps": ["TypeScript", "System Design"],
   *   "estimatedCompletion": "6 months",
   *   "confidence": 0.85
   * }
   * ```
   */
  @Post("recommendations")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
  generateLearningRecommendations(
    @Param("tenantId") tenantId: string,
    @Body() body: { 
      employeeId: string; 
      careerGoals: string[]; 
      currentSkills: Record<string, string>; 
      timeCommitment: string 
    }
  ) {
    return this.service.generateLearningRecommendations(tenantId, body.employeeId, body.careerGoals, body.currentSkills, body.timeCommitment);
  }
}
