package com.enterpriseclaw.cli;

import com.enterpriseclaw.cli.commands.AgentCommand;
import com.enterpriseclaw.cli.commands.DoctorCommand;
import com.enterpriseclaw.cli.commands.SessionsCommand;
import com.enterpriseclaw.cli.commands.SetupCommand;
import com.enterpriseclaw.cli.commands.SkillsCommand;
import picocli.CommandLine;

@CommandLine.Command(
        name = "ec",
        description = "EnterpriseClaw CLI",
        mixinStandardHelpOptions = true,
        version = "0.0.1-SNAPSHOT",
        subcommands = {
                AgentCommand.class,
                SessionsCommand.class,
                SkillsCommand.class,
                DoctorCommand.class,
                SetupCommand.class
        }
)
public class EnterpriseclawCli implements Runnable {

    public static void main(String[] args) {
        int exitCode = new CommandLine(new EnterpriseclawCli()).execute(args);
        System.exit(exitCode);
    }

    @Override
    public void run() {
        new CommandLine(this).usage(System.out);
    }
}
