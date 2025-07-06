import { ClassData, TopPerformingClass, ScheduledClass, TeacherHours } from '../types';

export const getClassDuration = (className: string): string => {
  const lowerName = className.toLowerCase();
  
  if (lowerName.includes('express')) {
    return '0.75'; // 45 minutes
  }
  
  if (lowerName.includes('recovery') || lowerName.includes('sweat in 30')) {
    return '0.5'; // 30 minutes
  }
  
  return '1'; // 60 minutes (default)
};

export const isHostedClass = (className: string): boolean => {
  return className.toLowerCase().includes('hosted');
};

// Location-specific class format rules
export const isClassAllowedAtLocation = (classFormat: string, location: string): boolean => {
  const lowerFormat = classFormat.toLowerCase();
  
  if (location === 'Supreme HQ, Bandra') {
    // Supreme HQ: PowerCycle ONLY, NO Amped Up or HIIT
    if (lowerFormat.includes('amped up') || lowerFormat.includes('hiit')) {
      return false;
    }
    return true; // All other classes allowed
  } else {
    // Other locations: NO PowerCycle or PowerCycle Express
    if (lowerFormat.includes('powercycle') || lowerFormat.includes('power cycle')) {
      return false;
    }
    return true; // All other classes allowed
  }
};

// Enhanced time restriction checking
export const isTimeRestricted = (time: string, day: string, isPrivateClass: boolean = false): boolean => {
  const hour = parseInt(time.split(':')[0]);
  const minute = parseInt(time.split(':')[1]);
  const timeInMinutes = hour * 60 + minute;
  
  // Restricted period: 12:00 PM to 5:00 PM (720 to 1020 minutes)
  const restrictedStart = 12 * 60; // 12:00 PM
  const restrictedEnd = 17 * 60; // 5:00 PM
  
  const isInRestrictedPeriod = timeInMinutes >= restrictedStart && timeInMinutes < restrictedEnd;
  
  // If it's a private class, it's allowed during restricted hours
  if (isPrivateClass && isInRestrictedPeriod) {
    return false; // Not restricted for private classes
  }
  
  // For regular classes, restricted during 12-5 PM
  return isInRestrictedPeriod;
};

// Get available time slots based on day and restrictions
export const getAvailableTimeSlots = (day: string): string[] => {
  // Morning slots: 7:30 AM to 11:30 AM
  const morningSlots = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
  
  // Evening slots: 5:00 PM to 7:30 PM (17:00 to 19:30)
  const eveningSlots = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
  
  return [...morningSlots, ...eveningSlots];
};

// Get restricted time slots (for display purposes)
export const getRestrictedTimeSlots = (): string[] => {
  // 12:00 PM to 5:00 PM slots
  return ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
};

// Check if time slot allows for balanced morning/evening distribution
export const isMorningSlot = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  return hour < 12; // Before 12 PM is considered morning
};

export const isEveningSlot = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  return hour >= 17; // 5 PM and after is considered evening
};

export const isPeakHour = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  // Peak hours: 7:00-11:30 AM and 5:30-8:00 PM
  return (hour >= 7 && hour <= 11) || (hour >= 17 && hour <= 19);
};

// Get shift balance for a location and day
export const getShiftBalance = (scheduledClasses: ScheduledClass[], location: string, day: string): { morning: number; evening: number } => {
  const dayClasses = scheduledClasses.filter(cls => cls.location === location && cls.day === day);
  
  const morning = dayClasses.filter(cls => isMorningSlot(cls.time)).length;
  const evening = dayClasses.filter(cls => isEveningSlot(cls.time)).length;
  
  return { morning, evening };
};

// Check if adding a class would maintain shift balance
export const maintainsShiftBalance = (
  scheduledClasses: ScheduledClass[],
  newClass: { day: string; time: string; location: string }
): boolean => {
  const currentBalance = getShiftBalance(scheduledClasses, newClass.location, newClass.day);
  const isNewClassMorning = isMorningSlot(newClass.time);
  
  if (isNewClassMorning) {
    // Adding morning class - check if it doesn't create too much imbalance
    return (currentBalance.morning + 1) <= currentBalance.evening + 2;
  } else {
    // Adding evening class - check if it doesn't create too much imbalance
    return (currentBalance.evening + 1) <= currentBalance.morning + 2;
  }
};

// Get teacher's daily hours
export const getTeacherDailyHours = (
  scheduledClasses: ScheduledClass[],
  teacherName: string,
  day: string
): number => {
  return scheduledClasses
    .filter(cls => 
      `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName && 
      cls.day === day
    )
    .reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
};

// Check if teacher can take another class (max 4 hours per day)
export const canTeacherTakeClass = (
  scheduledClasses: ScheduledClass[],
  teacherName: string,
  day: string,
  duration: string
): boolean => {
  const currentDailyHours = getTeacherDailyHours(scheduledClasses, teacherName, day);
  return currentDailyHours + parseFloat(duration) <= 4;
};

// Get teacher's days off
export const getTeacherDaysOff = (
  scheduledClasses: ScheduledClass[],
  teacherName: string
): string[] => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const workingDays = new Set(
    scheduledClasses
      .filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName)
      .map(cls => cls.day)
  );
  
  return days.filter(day => !workingDays.has(day));
};

// Check if teacher has at least 2 days off
export const hasMinimumDaysOff = (
  scheduledClasses: ScheduledClass[],
  teacherName: string
): boolean => {
  const daysOff = getTeacherDaysOff(scheduledClasses, teacherName);
  return daysOff.length >= 2;
};

// Calculate class performance score
export const calculateClassScore = (classData: ClassData[]): number => {
  if (classData.length === 0) return 0;
  
  const avgParticipants = classData.reduce((sum, cls) => sum + cls.participants, 0) / classData.length;
  const avgRevenue = classData.reduce((sum, cls) => sum + cls.totalRevenue, 0) / classData.length;
  const fillRate = avgParticipants / 20; // Assuming max capacity of 20
  const cancellationRate = classData.reduce((sum, cls) => sum + cls.lateCancellations, 0) / classData.length / avgParticipants;
  
  // Weighted score: 40% fill rate, 30% revenue, 20% participants, 10% low cancellation
  return (fillRate * 0.4) + ((avgRevenue / 10000) * 0.3) + ((avgParticipants / 20) * 0.2) + ((1 - cancellationRate) * 0.1);
};

// Get day-wise class guidelines
export const getDayGuidelines = (day: string): { focus: string; avoid: string[]; priority: string[] } => {
  const guidelines = {
    'Monday': {
      focus: 'Strong start with high-demand formats & senior trainers',
      avoid: ['Studio Recovery'],
      priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57']
    },
    'Tuesday': {
      focus: 'Balance beginner & intermediate classes',
      avoid: ['Studio HIIT', 'Studio Amped Up!'],
      priority: ['Studio Barre 57', 'Studio Mat 57', 'Studio Foundations', 'Studio Cardio Barre']
    },
    'Wednesday': {
      focus: 'Midweek peak - repeat Monday\'s popular formats',
      avoid: [],
      priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57']
    },
    'Thursday': {
      focus: 'Lighter mix with recovery formats',
      avoid: [],
      priority: ['Studio Recovery', 'Studio Mat 57', 'Studio Cardio Barre', 'Studio Back Body Blaze']
    },
    'Friday': {
      focus: 'Energy-focused with HIIT/Advanced classes',
      avoid: [],
      priority: ['Studio HIIT', 'Studio Amped Up!', 'Studio FIT', 'Studio Cardio Barre']
    },
    'Saturday': {
      focus: 'Family-friendly & community formats',
      avoid: ['Studio HIIT'],
      priority: ['Studio Barre 57', 'Studio Foundations', 'Studio Recovery', 'Studio Mat 57']
    },
    'Sunday': {
      focus: 'Max 4-5 classes, highest scoring formats only',
      avoid: ['Studio HIIT', 'Studio Amped Up!'],
      priority: ['Studio Barre 57', 'Studio Recovery', 'Studio Mat 57']
    }
  };
  
  return guidelines[day] || { focus: '', avoid: [], priority: [] };
};

// Default top performing classes that should be populated by default
export const getDefaultTopClasses = (): Array<{
  classFormat: string;
  day: string;
  time: string;
  location: string;
  teacher: string;
  avgParticipants: number;
  isLocked: boolean;
}> => {
  return [
    // Saturday 10:15 Mat 57 at Kemps Corner - MUST be included
    {
      classFormat: 'Studio Mat 57',
      day: 'Saturday',
      time: '10:15',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Karanvir Bhatia',
      avgParticipants: 25,
      isLocked: true
    },
    // Tuesday 19:15 FIT at Kemps Corner
    {
      classFormat: 'Studio FIT',
      day: 'Tuesday',
      time: '19:15',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 9.19,
      isLocked: true
    },
    // Wednesday 19:15 Mat 57 at Kemps Corner
    {
      classFormat: 'Studio Mat 57',
      day: 'Wednesday',
      time: '19:15',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Karanvir Bhatia',
      avgParticipants: 9.35,
      isLocked: true
    },
    // Friday 09:00 FIT at Kemps Corner
    {
      classFormat: 'Studio FIT',
      day: 'Friday',
      time: '09:00',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 11.08,
      isLocked: true
    },
    // Wednesday 09:00 Back Body Blaze at Kemps Corner
    {
      classFormat: 'Studio Back Body Blaze',
      day: 'Wednesday',
      time: '09:00',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 10.58,
      isLocked: true
    },
    // Sunday 11:30 Barre 57 at Kemps Corner
    {
      classFormat: 'Studio Barre 57',
      day: 'Sunday',
      time: '11:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Rohan Dahima',
      avgParticipants: 9.8,
      isLocked: true
    },
    // Monday 08:30 Mat 57 at Kemps Corner
    {
      classFormat: 'Studio Mat 57',
      day: 'Monday',
      time: '08:30',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Anisha Shah',
      avgParticipants: 10.54,
      isLocked: true
    },
    // Monday 18:45 Barre 57 at Kemps Corner
    {
      classFormat: 'Studio Barre 57',
      day: 'Monday',
      time: '18:45',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Pranjali Jain',
      avgParticipants: 8.65,
      isLocked: true
    },
    // Sunday 10:00 powerCycle at Supreme HQ
    {
      classFormat: 'Studio powerCycle',
      day: 'Sunday',
      time: '10:00',
      location: 'Supreme HQ, Bandra',
      teacher: 'Cauveri Vikrant',
      avgParticipants: 8.5,
      isLocked: true
    },
    // Tuesday 11:00 Mat 57 at Kemps Corner
    {
      classFormat: 'Studio Mat 57',
      day: 'Tuesday',
      time: '11:00',
      location: 'Kwality House, Kemps Corner',
      teacher: 'Atulan Purohit',
      avgParticipants: 8.62,
      isLocked: true
    }
  ];
};

// Enhanced AI optimization with comprehensive rules
export const generateIntelligentSchedule = async (
  csvData: ClassData[],
  customTeachers: any[] = [],
  options: {
    prioritizeTopPerformers?: boolean;
    balanceShifts?: boolean;
    optimizeTeacherHours?: boolean;
    respectTimeRestrictions?: boolean;
    minimizeTrainersPerShift?: boolean;
    targetDay?: string;
    iteration?: number;
    optimizationType?: 'revenue' | 'attendance' | 'balanced';
  } = {}
): Promise<ScheduledClass[]> => {
  const optimizedClasses: ScheduledClass[] = [];
  const teacherHoursTracker: Record<string, number> = {};
  const teacherDailyHours: Record<string, Record<string, number>> = {};
  const teacherShiftAssignments: Record<string, Record<string, { morning: boolean; evening: boolean }>> = {};
  
  // Define trainer categories
  const seniorTrainers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const newTrainers = ['Kabir', 'Simonelle'];
  const underutilizedTrainers = ['Reshma', 'Karanvir', 'Richard'];
  const advancedFormats = ['Studio HIIT', 'Studio Amped Up!'];
  const beginnerFormats = ['Studio Barre 57', 'Studio Foundations', 'Studio Recovery', 'Studio powerCycle'];
  
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const days = options.targetDay ? [options.targetDay] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Get all available teachers
  const allTeachers = [...new Set(csvData.map(item => item.teacherName))]
    .filter(teacher => !teacher.includes('Nishanth') && !teacher.includes('Saniya'));

  // Initialize teacher tracking
  allTeachers.forEach(teacher => {
    teacherHoursTracker[teacher] = 0;
    teacherDailyHours[teacher] = {};
    teacherShiftAssignments[teacher] = {};
    days.forEach(day => {
      teacherDailyHours[teacher][day] = 0;
      teacherShiftAssignments[teacher][day] = { morning: false, evening: false };
    });
  });
  
  // Helper function to check if teacher can take class
  const canAssignTeacher = (teacherName: string, day: string, time: string, duration: string, classFormat: string): boolean => {
    const weeklyHours = teacherHoursTracker[teacherName] || 0;
    const dailyHours = teacherDailyHours[teacherName]?.[day] || 0;
    const classDuration = parseFloat(duration);
    
    // Check new trainer restrictions
    const isNewTrainer = newTrainers.some(name => teacherName.includes(name));
    const maxWeeklyHours = isNewTrainer ? 10 : 15;
    
    // New trainers can only teach specific formats
    if (isNewTrainer) {
      const allowedFormats = ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'];
      if (!allowedFormats.includes(classFormat)) {
        return false;
      }
    }
    
    // Advanced formats only for senior trainers
    if (advancedFormats.includes(classFormat) && !seniorTrainers.some(name => teacherName.includes(name))) {
      return false;
    }
    
    // Check hour limits
    if (weeklyHours + classDuration > maxWeeklyHours || dailyHours + classDuration > 4) {
      return false;
    }
    
    // Check if teacher already has 2 days off
    const currentWorkingDays = Object.keys(teacherDailyHours[teacherName]).filter(d => teacherDailyHours[teacherName][d] > 0).length;
    if (currentWorkingDays >= 5 && teacherDailyHours[teacherName][day] === 0) {
      return false; // Would violate 2 days off rule
    }
    
    return true;
  };
  
  // Helper function to assign class
  const assignClass = (classData: any, teacher: string): void => {
    const duration = getClassDuration(classData.classFormat);
    
    optimizedClasses.push({
      id: `ai-optimized-${classData.location}-${classData.day}-${classData.time}-${Date.now()}-${Math.random()}`,
      day: classData.day,
      time: classData.time,
      location: classData.location,
      classFormat: classData.classFormat,
      teacherFirstName: teacher.split(' ')[0],
      teacherLastName: teacher.split(' ').slice(1).join(' '),
      duration: duration,
      participants: classData.avgParticipants,
      revenue: classData.avgRevenue,
      isTopPerformer: classData.avgParticipants > 6,
      isPrivate: classData.isPrivate || false
    });
    
    // Update tracking
    teacherHoursTracker[teacher] = parseFloat(((teacherHoursTracker[teacher] || 0) + parseFloat(duration)).toFixed(1));
    teacherDailyHours[teacher][classData.day] = parseFloat(((teacherDailyHours[teacher][classData.day] || 0) + parseFloat(duration)).toFixed(1));
    
    // Track shift assignments
    if (isMorningSlot(classData.time)) {
      teacherShiftAssignments[teacher][classData.day].morning = true;
    } else if (isEveningSlot(classData.time)) {
      teacherShiftAssignments[teacher][classData.day].evening = true;
    }
  };

  // Helper function to get best class for slot
  const getBestClassForSlot = (location: string, day: string, time: string, guidelines: any): any => {
    const slotData = csvData.filter(item => 
      item.location === location &&
      item.dayOfWeek === day &&
      item.classTime.includes(time) &&
      !isHostedClass(item.cleanedClass) &&
      isClassAllowedAtLocation(item.cleanedClass, location) &&
      !guidelines.avoid.includes(item.cleanedClass) &&
      item.participants >= 4
    );

    if (slotData.length === 0) return null;

    // Group by class format and calculate performance
    const formatStats = slotData.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) {
        acc[item.cleanedClass] = { participants: 0, revenue: 0, count: 0 };
      }
      acc[item.cleanedClass].participants += item.participants;
      acc[item.cleanedClass].revenue += item.totalRevenue;
      acc[item.cleanedClass].count += 1;
      return acc;
    }, {} as any);

    // Convert to ranked array
    const rankedFormats = Object.entries(formatStats)
      .map(([format, stats]: [string, any]) => ({
        classFormat: format,
        avgParticipants: stats.participants / stats.count,
        avgRevenue: stats.revenue / stats.count,
        count: stats.count,
        isPriority: guidelines.priority.includes(format)
      }))
      .sort((a, b) => {
        // Prioritize day guidelines first, then performance
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return b.avgParticipants - a.avgParticipants;
      });

    return rankedFormats[0] || null;
  };

  // Phase 0: Schedule default top performing classes first (locked classes)
  console.log('Phase 0: Scheduling default top performing classes...');
  
  const defaultTopClasses = getDefaultTopClasses();
  for (const defaultClass of defaultTopClasses) {
    if (options.targetDay && defaultClass.day !== options.targetDay) continue;
    
    if (canAssignTeacher(defaultClass.teacher, defaultClass.day, defaultClass.time, getClassDuration(defaultClass.classFormat), defaultClass.classFormat)) {
      assignClass({
        classFormat: defaultClass.classFormat,
        location: defaultClass.location,
        day: defaultClass.day,
        time: defaultClass.time,
        avgParticipants: defaultClass.avgParticipants,
        avgRevenue: 0,
        isLocked: true
      }, defaultClass.teacher);
    }
  }

  // Phase 1: Fill ALL available time slots systematically
  console.log('Phase 1: Filling all available time slots...');
  
  for (const day of days) {
    const guidelines = getDayGuidelines(day);
    const availableSlots = getAvailableTimeSlots(day);
    
    // Limit Sunday classes to max 5
    const maxClassesForDay = day === 'Sunday' ? 5 : availableSlots.length * locations.length;
    let classesScheduledForDay = optimizedClasses.filter(cls => cls.day === day).length;
    
    for (const location of locations) {
      // Set parallel class requirements based on location and time
      for (const time of availableSlots) {
        if (classesScheduledForDay >= maxClassesForDay) break;
        
        const isPeak = isPeakHour(time);
        
        // Determine how many parallel classes to schedule
        let classesToSchedule = 1;
        
        if (location === 'Kwality House, Kemps Corner') {
          if (['09:00', '11:00', '18:00', '19:15'].includes(time)) {
            classesToSchedule = 2; // 2 parallel classes at specified times
          }
        } else if (location === 'Supreme HQ, Bandra') {
          if (['08:00', '09:00', '10:00', '18:00', '19:00'].includes(time)) {
            classesToSchedule = 2; // 2 parallel classes at specified times
          }
        }
        
        // Check existing classes in this slot
        const existingClasses = optimizedClasses.filter(cls => 
          cls.location === location && cls.day === day && cls.time === time
        );
        
        const remainingSlots = classesToSchedule - existingClasses.length;
        
        for (let i = 0; i < remainingSlots; i++) {
          const bestClass = getBestClassForSlot(location, day, time, guidelines);
          
          if (bestClass) {
            // Ensure different class formats in same slot
            const existingFormats = optimizedClasses
              .filter(cls => cls.location === location && cls.day === day && cls.time === time)
              .map(cls => cls.classFormat);
            
            if (existingFormats.includes(bestClass.classFormat)) continue;
            
            // Find best teacher for this class
            let bestTeacher = getBestTeacherForClass(csvData, bestClass.classFormat, location, day, time);
            
            // If best teacher not available, try other suitable teachers
            if (!bestTeacher || !canAssignTeacher(bestTeacher, day, time, getClassDuration(bestClass.classFormat), bestClass.classFormat)) {
              // Try senior trainers first for peak hours
              const candidateTeachers = isPeak ? 
                allTeachers.filter(t => seniorTrainers.some(st => t.includes(st))) :
                allTeachers;
              
              bestTeacher = candidateTeachers.find(teacher => 
                canAssignTeacher(teacher, day, time, getClassDuration(bestClass.classFormat), bestClass.classFormat)
              );
            }
            
            if (bestTeacher) {
              assignClass({
                classFormat: bestClass.classFormat,
                location: location,
                day: day,
                time: time,
                avgParticipants: bestClass.avgParticipants,
                avgRevenue: bestClass.avgRevenue
              }, bestTeacher);
              
              classesScheduledForDay++;
            }
          }
        }
      }
    }
  }

  // Phase 2: Optimize ALL teachers to reach 15 hours (or 10 for new trainers)
  console.log('Phase 2: Optimizing ALL teacher hours to maximum...');
  
  for (const teacher of allTeachers) {
    const currentHours = teacherHoursTracker[teacher] || 0;
    const isNewTrainer = newTrainers.some(name => teacher.includes(name));
    const targetHours = isNewTrainer ? 10 : 15;
    
    if (currentHours < targetHours) {
      const teacherSpecialties = getTeacherSpecialties(csvData)[teacher] || [];
      
      for (const specialty of teacherSpecialties.slice(0, 3)) {
        if (teacherHoursTracker[teacher] >= targetHours) break;
        
        // Find available slots for this teacher
        for (const location of locations) {
          if (!isClassAllowedAtLocation(specialty.classFormat, location)) continue;
          
          for (const day of days) {
            if (teacherDailyHours[teacher][day] >= 4) continue;
            
            const availableSlots = getAvailableTimeSlots(day);
            
            for (const time of availableSlots) {
              const existingClasses = optimizedClasses.filter(cls => 
                cls.location === location && cls.day === day && cls.time === time
              );
              
              const maxParallel = location === 'Supreme HQ, Bandra' ? 3 : 2;
              if (existingClasses.length >= maxParallel) continue;
              
              // Ensure different formats
              if (existingClasses.some(cls => cls.classFormat === specialty.classFormat)) continue;
              
              if (canAssignTeacher(teacher, day, time, getClassDuration(specialty.classFormat), specialty.classFormat)) {
                assignClass({
                  classFormat: specialty.classFormat,
                  location: location,
                  day: day,
                  time: time,
                  avgParticipants: specialty.avgParticipants,
                  avgRevenue: 0
                }, teacher);
                break;
              }
            }
          }
        }
      }
    }
  }

  // Phase 3: Ensure class diversity and fill remaining gaps
  console.log('Phase 3: Ensuring class diversity...');
  
  const requiredFormats = ['Studio Cardio Barre', 'Studio Mat 57', 'Studio Back Body Blaze', 'Studio Amped Up!'];
  
  for (const format of requiredFormats) {
    const formatCount = optimizedClasses.filter(cls => cls.classFormat === format).length;
    
    if (formatCount < 3) { // Ensure at least 3 of each format per week
      for (const location of locations) {
        if (!isClassAllowedAtLocation(format, location)) continue;
        
        for (const day of days) {
          const availableSlots = getAvailableTimeSlots(day);
          
          for (const time of availableSlots) {
            const existingClasses = optimizedClasses.filter(cls => 
              cls.location === location && cls.day === day && cls.time === time
            );
            
            const maxParallel = location === 'Supreme HQ, Bandra' ? 3 : 2;
            if (existingClasses.length >= maxParallel) continue;
            
            // Ensure different formats
            if (existingClasses.some(cls => cls.classFormat === format)) continue;
            
            // Find suitable teacher
            const bestTeacher = getBestTeacherForClass(csvData, format, location, day, time);
            
            if (bestTeacher && canAssignTeacher(bestTeacher, day, time, getClassDuration(format), format)) {
              const classAverage = getClassAverageForSlot(csvData, format, location, day, time);
              
              assignClass({
                classFormat: format,
                location: location,
                day: day,
                time: time,
                avgParticipants: classAverage.average || 6,
                avgRevenue: 0
              }, bestTeacher);
              break;
            }
          }
        }
      }
    }
  }

  // Phase 4: Consolidate trainers per shift (minimize trainers per location/shift)
  console.log('Phase 4: Consolidating trainer shifts...');
  
  for (const location of locations) {
    for (const day of days) {
      // Get morning and evening classes
      const morningClasses = optimizedClasses.filter(cls => 
        cls.location === location && cls.day === day && isMorningSlot(cls.time)
      );
      const eveningClasses = optimizedClasses.filter(cls => 
        cls.location === location && cls.day === day && isEveningSlot(cls.time)
      );
      
      // Try to consolidate morning shift
      const morningTeachers = [...new Set(morningClasses.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`))];
      if (morningTeachers.length > 2) {
        // Try to reassign some classes to reduce teacher count
        const teacherClassCounts = morningTeachers.map(teacher => ({
          teacher,
          count: morningClasses.filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher).length
        })).sort((a, b) => a.count - b.count);
        
        // Try to reassign classes from teachers with fewer classes
        for (const { teacher } of teacherClassCounts.slice(0, -2)) {
          const teacherClasses = morningClasses.filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher);
          
          for (const cls of teacherClasses) {
            // Try to reassign to a teacher who already has classes this morning
            const targetTeacher = teacherClassCounts.slice(-2).find(t => 
              canAssignTeacher(t.teacher, day, cls.time, cls.duration, cls.classFormat)
            );
            
            if (targetTeacher) {
              // Update the class assignment
              const classIndex = optimizedClasses.findIndex(c => c.id === cls.id);
              if (classIndex > -1) {
                const [firstName, ...lastNameParts] = targetTeacher.teacher.split(' ');
                optimizedClasses[classIndex].teacherFirstName = firstName;
                optimizedClasses[classIndex].teacherLastName = lastNameParts.join(' ');
                
                // Update tracking
                teacherHoursTracker[teacher] -= parseFloat(cls.duration);
                teacherHoursTracker[targetTeacher.teacher] += parseFloat(cls.duration);
                teacherDailyHours[teacher][day] -= parseFloat(cls.duration);
                teacherDailyHours[targetTeacher.teacher][day] += parseFloat(cls.duration);
              }
            }
          }
        }
      }
      
      // Same for evening shift
      const eveningTeachers = [...new Set(eveningClasses.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`))];
      if (eveningTeachers.length > 2) {
        const teacherClassCounts = eveningTeachers.map(teacher => ({
          teacher,
          count: eveningClasses.filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher).length
        })).sort((a, b) => a.count - b.count);
        
        for (const { teacher } of teacherClassCounts.slice(0, -2)) {
          const teacherClasses = eveningClasses.filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher);
          
          for (const cls of teacherClasses) {
            const targetTeacher = teacherClassCounts.slice(-2).find(t => 
              canAssignTeacher(t.teacher, day, cls.time, cls.duration, cls.classFormat)
            );
            
            if (targetTeacher) {
              const classIndex = optimizedClasses.findIndex(c => c.id === cls.id);
              if (classIndex > -1) {
                const [firstName, ...lastNameParts] = targetTeacher.teacher.split(' ');
                optimizedClasses[classIndex].teacherFirstName = firstName;
                optimizedClasses[classIndex].teacherLastName = lastNameParts.join(' ');
                
                teacherHoursTracker[teacher] -= parseFloat(cls.duration);
                teacherHoursTracker[targetTeacher.teacher] += parseFloat(cls.duration);
                teacherDailyHours[teacher][day] -= parseFloat(cls.duration);
                teacherDailyHours[targetTeacher.teacher][day] += parseFloat(cls.duration);
              }
            }
          }
        }
      }
    }
  }

  // Phase 5: Balance morning and evening classes
  console.log('Phase 5: Balancing morning and evening distribution...');
  
  for (const location of locations) {
    for (const day of days) {
      const balance = getShiftBalance(optimizedClasses, location, day);
      const imbalance = Math.abs(balance.morning - balance.evening);
      
      if (imbalance > 2) {
        // Try to move some classes to balance
        const excessShift = balance.morning > balance.evening ? 'morning' : 'evening';
        const deficitShift = balance.morning > balance.evening ? 'evening' : 'morning';
        
        const excessClasses = optimizedClasses.filter(cls => 
          cls.location === location && 
          cls.day === day && 
          (excessShift === 'morning' ? isMorningSlot(cls.time) : isEveningSlot(cls.time))
        );
        
        // Try to find alternative time slots for some classes
        for (const cls of excessClasses.slice(0, Math.ceil(imbalance / 2))) {
          const availableSlots = getAvailableTimeSlots(day);
          const targetSlots = availableSlots.filter(time => 
            deficitShift === 'morning' ? isMorningSlot(time) : isEveningSlot(time)
          );
          
          for (const newTime of targetSlots) {
            const existingClasses = optimizedClasses.filter(c => 
              c.location === location && c.day === day && c.time === newTime
            );
            
            const maxParallel = location === 'Supreme HQ, Bandra' ? 3 : 2;
            if (existingClasses.length < maxParallel && 
                !existingClasses.some(c => c.classFormat === cls.classFormat)) {
              
              // Update the class time
              const classIndex = optimizedClasses.findIndex(c => c.id === cls.id);
              if (classIndex > -1) {
                optimizedClasses[classIndex].time = newTime;
                break;
              }
            }
          }
        }
      }
    }
  }

  console.log('Comprehensive optimization complete!');
  console.log('Total classes scheduled:', optimizedClasses.length);
  console.log('Teacher utilization:', Object.entries(teacherHoursTracker).map(([teacher, hours]) => `${teacher}: ${hours}h`));
  
  // Final validation
  const emptySlots: string[] = [];
  const availableSlots = getAvailableTimeSlots('Monday');
  
  for (const location of locations) {
    for (const day of days) {
      for (const time of availableSlots) {
        const classesInSlot = optimizedClasses.filter(cls => 
          cls.location === location && cls.day === day && cls.time === time
        );
        
        if (classesInSlot.length === 0) {
          emptySlots.push(`${location} - ${day} ${time}`);
        }
      }
    }
  }
  
  if (emptySlots.length > 0) {
    console.warn('Empty slots remaining:', emptySlots.length);
  }
  
  return optimizedClasses;
};

// Rest of the existing utility functions remain the same...
export const getLocationAverage = (csvData: ClassData[], location: string): number => {
  const locationData = csvData.filter(item => item.location === location && !isHostedClass(item.cleanedClass));
  if (locationData.length === 0) return 0;
  
  const totalParticipants = locationData.reduce((sum, item) => sum + item.participants, 0);
  return totalParticipants / locationData.length;
};

export const getTopPerformingClasses = (csvData: ClassData[], minAverage: number = 6, includeTeacher: boolean = true): TopPerformingClass[] => {
  // Always include the default top classes first
  const defaultClasses = getDefaultTopClasses();
  
  // Filter out hosted classes and apply location rules
  const validClasses = csvData.filter(item => 
    !isHostedClass(item.cleanedClass) && 
    isClassAllowedAtLocation(item.cleanedClass, item.location)
  );
  
  // Group by class format, location, day, time, and optionally teacher
  const classGroups = validClasses.reduce((acc, item) => {
    const key = includeTeacher 
      ? `${item.cleanedClass}-${item.location}-${item.dayOfWeek}-${item.classTime.slice(0, 5)}-${item.teacherName}`
      : `${item.cleanedClass}-${item.location}-${item.dayOfWeek}-${item.classTime.slice(0, 5)}`;
    
    if (!acc[key]) {
      acc[key] = {
        classFormat: item.cleanedClass,
        location: item.location,
        day: item.dayOfWeek,
        time: item.classTime.slice(0, 5),
        teacher: includeTeacher ? item.teacherName : '',
        totalParticipants: 0,
        totalRevenue: 0,
        count: 0
      };
    }
    
    acc[key].totalParticipants += item.participants;
    acc[key].totalRevenue += item.totalRevenue;
    acc[key].count += 1;
    
    return acc;
  }, {} as any);
  
  // Filter classes above minimum average and sort by performance
  const topClasses = Object.values(classGroups)
    .map((group: any) => ({
      classFormat: group.classFormat,
      location: group.location,
      day: group.day,
      time: group.time,
      teacher: group.teacher,
      avgParticipants: parseFloat((group.totalParticipants / group.count).toFixed(1)),
      avgRevenue: parseFloat((group.totalRevenue / group.count).toFixed(1)),
      frequency: group.count
    }))
    .filter(cls => cls.frequency >= 2 && cls.avgParticipants >= minAverage)
    .sort((a, b) => {
      // Sort by average participants first, then by frequency
      const participantDiff = b.avgParticipants - a.avgParticipants;
      if (Math.abs(participantDiff) > 1) return participantDiff;
      return b.frequency - a.frequency;
    });
  
  // Convert default classes to TopPerformingClass format and merge
  const defaultTopClasses = defaultClasses.map(cls => ({
    classFormat: cls.classFormat,
    location: cls.location,
    day: cls.day,
    time: cls.time,
    teacher: cls.teacher,
    avgParticipants: cls.avgParticipants,
    avgRevenue: 0,
    frequency: 10 // High frequency to ensure they stay at top
  }));
  
  // Merge and deduplicate
  const allTopClasses = [...defaultTopClasses, ...topClasses];
  const uniqueClasses = allTopClasses.filter((cls, index, arr) => 
    arr.findIndex(c => 
      c.classFormat === cls.classFormat && 
      c.location === cls.location && 
      c.day === cls.day && 
      c.time === cls.time
    ) === index
  );
  
  return uniqueClasses;
};

export const getBestTeacherForClass = (
  csvData: ClassData[], 
  classFormat: string, 
  location: string, 
  day: string, 
  time: string
): string | null => {
  // Check if this is a default top class first
  const defaultClass = getDefaultTopClasses().find(cls => 
    cls.classFormat === classFormat &&
    cls.location === location &&
    cls.day === day &&
    cls.time === time
  );
  
  if (defaultClass) {
    return defaultClass.teacher;
  }
  
  const relevantClasses = csvData.filter(item => 
    item.cleanedClass === classFormat &&
    item.location === location &&
    item.dayOfWeek === day &&
    item.classTime.includes(time) &&
    !isHostedClass(item.cleanedClass) &&
    !item.teacherName.includes('Nishanth') &&
    !item.teacherName.includes('Saniya')
  );

  if (relevantClasses.length === 0) return null;

  // Group by teacher and calculate averages
  const teacherStats = relevantClasses.reduce((acc, item) => {
    if (!acc[item.teacherName]) {
      acc[item.teacherName] = { participants: 0, count: 0 };
    }
    acc[item.teacherName].participants += item.participants;
    acc[item.teacherName].count += 1;
    return acc;
  }, {} as any);

  // Find teacher with highest average
  const bestTeacher = Object.entries(teacherStats)
    .map(([teacher, stats]: [string, any]) => ({
      teacher,
      avgParticipants: stats.participants / stats.count
    }))
    .sort((a, b) => b.avgParticipants - a.avgParticipants)[0];

  return bestTeacher?.teacher || null;
};

export const getClassAverageForSlot = (
  csvData: ClassData[],
  classFormat: string,
  location: string,
  day: string,
  time: string,
  teacherName?: string
): { average: number; count: number } => {
  let relevantClasses = csvData.filter(item => 
    item.cleanedClass === classFormat &&
    item.location === location &&
    item.dayOfWeek === day &&
    item.classTime.includes(time) &&
    !isHostedClass(item.cleanedClass)
  );

  if (teacherName) {
    relevantClasses = relevantClasses.filter(item => item.teacherName === teacherName);
  }

  if (relevantClasses.length === 0) {
    return { average: 0, count: 0 };
  }

  const totalParticipants = relevantClasses.reduce((sum, item) => sum + item.participants, 0);
  return {
    average: parseFloat((totalParticipants / relevantClasses.length).toFixed(1)),
    count: relevantClasses.length
  };
};

export const getTeacherSpecialties = (csvData: ClassData[]): Record<string, Array<{ classFormat: string; avgParticipants: number; classCount: number }>> => {
  const teacherStats: Record<string, Record<string, { participants: number; count: number }>> = {};

  csvData.forEach(item => {
    if (isHostedClass(item.cleanedClass)) return;
    if (item.teacherName.includes('Nishanth') || item.teacherName.includes('Saniya')) return;

    if (!teacherStats[item.teacherName]) {
      teacherStats[item.teacherName] = {};
    }

    if (!teacherStats[item.teacherName][item.cleanedClass]) {
      teacherStats[item.teacherName][item.cleanedClass] = { participants: 0, count: 0 };
    }

    teacherStats[item.teacherName][item.cleanedClass].participants += item.participants;
    teacherStats[item.teacherName][item.cleanedClass].count += 1;
  });

  // Convert to sorted specialties for each teacher
  const specialties: Record<string, Array<{ classFormat: string; avgParticipants: number; classCount: number }>> = {};

  Object.entries(teacherStats).forEach(([teacher, classes]) => {
    specialties[teacher] = Object.entries(classes)
      .map(([classFormat, stats]) => ({
        classFormat,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1)),
        classCount: stats.count
      }))
      .sort((a, b) => {
        // Sort by class count first (experience), then by average participants
        if (b.classCount !== a.classCount) {
          return b.classCount - a.classCount;
        }
        return b.avgParticipants - a.avgParticipants;
      })
      .slice(0, 5); // Top 5 specialties
  });

  return specialties;
};

export const validateTeacherHours = (
  scheduledClasses: ScheduledClass[],
  newClass: ScheduledClass
): { isValid: boolean; warning?: string; error?: string } => {
  const teacherName = `${newClass.teacherFirstName} ${newClass.teacherLastName}`;
  
  // Calculate current hours for this teacher
  const currentHours = scheduledClasses
    .filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName)
    .reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
  
  const newTotal = currentHours + parseFloat(newClass.duration);
  
  // Check new trainer restrictions
  const newTrainers = ['Kabir', 'Simonelle'];
  const isNewTrainer = newTrainers.some(name => teacherName.includes(name));
  const maxHours = isNewTrainer ? 10 : 15;
  
  if (newTotal > maxHours) {
    return {
      isValid: false,
      error: `This would exceed ${teacherName}'s ${maxHours}-hour weekly limit (currently ${currentHours.toFixed(1)}h, would be ${newTotal.toFixed(1)}h)`
    };
  } else if (newTotal > (maxHours - 3)) {
    return {
      isValid: true,
      warning: `${teacherName} would have ${newTotal.toFixed(1)}h this week (approaching ${maxHours}h limit)`
    };
  }
  
  return { isValid: true };
};

export const calculateTeacherHours = (scheduledClasses: ScheduledClass[]): TeacherHours => {
  return scheduledClasses.reduce((acc, cls) => {
    const teacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
    acc[teacherName] = parseFloat(((acc[teacherName] || 0) + parseFloat(cls.duration)).toFixed(1));
    return acc;
  }, {} as TeacherHours);
};

export const getClassCounts = (scheduledClasses: ScheduledClass[]) => {
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const counts = locations.reduce((acc, location) => {
    acc[location] = days.reduce((dayAcc, day) => {
      const dayClasses = scheduledClasses.filter(cls => cls.location === location && cls.day === day);
      dayAcc[day] = dayClasses.reduce((classAcc, cls) => {
        classAcc[cls.classFormat] = (classAcc[cls.classFormat] || 0) + 1;
        return classAcc;
      }, {} as any);
      return dayAcc;
    }, {} as any);
    return acc;
  }, {} as any);
  
  return counts;
};

export const getUniqueTeachers = (csvData: ClassData[], customTeachers: any[] = []): string[] => {
  const csvTeachers = csvData
    .map(item => item.teacherName)
    .filter(teacher => !teacher.includes('Nishanth') && !teacher.includes('Saniya'));
  const customTeacherNames = customTeachers.map(t => `${t.firstName} ${t.lastName}`);
  
  return [...new Set([...csvTeachers, ...customTeacherNames])].sort();
};

export const getClassFormatsForDay = (scheduledClasses: ScheduledClass[], day: string): Record<string, number> => {
  const dayClasses = scheduledClasses.filter(cls => cls.day === day);
  return dayClasses.reduce((acc, cls) => {
    acc[cls.classFormat] = (acc[cls.classFormat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

export const getTimeSlotsWithData = (csvData: ClassData[], location: string): Set<string> => {
  const timeSlotsWithData = new Set<string>();
  
  csvData
    .filter(item => item.location === location && !isHostedClass(item.cleanedClass))
    .forEach(item => {
      const timeSlot = item.classTime.slice(0, 5); // Extract HH:MM format
      timeSlotsWithData.add(timeSlot);
    });
  
  return timeSlotsWithData;
};

export const getClassesAtTimeSlot = (
  scheduledClasses: ScheduledClass[],
  day: string,
  time: string,
  location: string
): ScheduledClass[] => {
  return scheduledClasses.filter(cls => 
    cls.day === day && cls.time === time && cls.location === location
  );
};

export const hasTimeSlotCapacity = (
  scheduledClasses: ScheduledClass[],
  day: string,
  time: string,
  location: string
): boolean => {
  const existingClasses = getClassesAtTimeSlot(scheduledClasses, day, time, location);
  const maxClasses = location === 'Supreme HQ, Bandra' ? 3 : 2;
  return existingClasses.length < maxClasses;
};