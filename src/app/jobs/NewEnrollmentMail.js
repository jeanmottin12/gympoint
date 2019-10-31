import Mail from '../../lib/Mail';

class NewEnrollmentMail {
  get key() {
    return 'NewEnrollmentMail';
  }

  async handle({ data }) {
    const { enrollment, student } = data;

    await Mail.sendMail({
      to: `${student.name} <${student.email}>`,
      subject: 'Nova Matrícula',
      template: 'newEnrollment',
      context: {
        student: student.name,
        plan: enrollment.plan_id,
        end_date: enrollment.end_date,
      },
    });
  }
}

export default new NewEnrollmentMail();
