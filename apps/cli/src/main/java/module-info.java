module com.enterpriseclaw.cli {
    requires info.picocli;
    requires java.net.http;
    requires com.fasterxml.jackson.databind;
    opens com.enterpriseclaw.cli to info.picocli;
    opens com.enterpriseclaw.cli.commands to info.picocli;
}
