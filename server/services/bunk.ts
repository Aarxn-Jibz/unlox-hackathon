import type { SubjectAttendance } from '../../types';

export interface SubjectInput {
  subjectName: string;
  attended: number;
  total: number;
  targetPercentage?: number;
}

export interface AnalyzedSubject extends SubjectAttendance {
  isAtRisk: boolean;
}

export class BunkService {
  /**
   * Calculates the attendance percentage, safe skips (bunks), or consecutive classes to attend.
   */
  public static calculateSafeSkips(
    attended: number,
    total: number,
    targetPercentage = 75,
  ): {
    percentage: number;
    bunksPossible: number;
    classesToAttend: number;
  } {
    // Handle edge case: total = 0
    if (total === 0) {
      return {
        percentage: 0,
        bunksPossible: 0,
        classesToAttend: 0,
      };
    }

    const percentage = (attended / total) * 100;
    const targetFraction = targetPercentage / 100;

    let bunksPossible = 0;
    let classesToAttend = 0;

    // Use percentage >= targetPercentage to capture target percentage and above
    if (percentage >= targetPercentage) {
      bunksPossible = Math.floor(attended / targetFraction - total);
      if (bunksPossible < 0) bunksPossible = 0;
    } else {
      classesToAttend = Math.ceil((targetFraction * total - attended) / (1 - targetFraction));
      if (classesToAttend < 0) classesToAttend = 0;
    }

    return {
      percentage,
      bunksPossible,
      classesToAttend,
    };
  }

  /**
   * Analyzes the risk of a list of subjects.
   */
  public static analyzeRisk(subjects: SubjectInput[]): AnalyzedSubject[] {
    return subjects.map((sub) => {
      const targetPercentage = sub.targetPercentage ?? 75;
      const stats = this.calculateSafeSkips(sub.attended, sub.total, targetPercentage);
      const isAtRisk = stats.percentage < 80;

      return {
        subjectName: sub.subjectName,
        attended: sub.attended,
        total: sub.total,
        targetPercentage,
        percentage: stats.percentage,
        bunksPossible: stats.bunksPossible,
        classesToAttend: stats.classesToAttend,
        isAtRisk,
      };
    });
  }
}
